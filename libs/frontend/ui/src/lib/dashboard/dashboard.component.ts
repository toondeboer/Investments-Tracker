import { Component, DestroyRef, OnInit, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { take, timer } from 'rxjs';
import {
  selectBaseCurrency,
  selectLoading,
  selectPortfoliosDbo,
  selectSelectedPortfolioIds,
  selectState,
  selectTimeRange,
  setSelectedPortfolios,
  setTimeRange,
} from '@aws/state';
import { loadStatus, selectIsPaidMember, selectPlan } from '@aws/captain';
import { getCurrencySymbol, TIME_RANGE_LABELS, TimeRange } from '@aws/util';
import { Store } from '@ngrx/store';
import { LucideAngularModule } from 'lucide-angular';
import { SummaryComponent } from '../summary/summary.component';
import { AsyncPipe, CommonModule, DatePipe } from '@angular/common';
import { ActiveTickersComponent } from '../active-tickers/active-tickers.component';
import { InsightsBannerComponent } from '../insights-banner/insights-banner.component';
import { SkeletonComponent } from '../skeleton/skeleton.component';

@Component({
  selector: 'aws-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss'],
  imports: [
    SummaryComponent,
    AsyncPipe,
    CommonModule,
    DatePipe,
    ActiveTickersComponent,
    InsightsBannerComponent,
    LucideAngularModule,
    RouterLink,
    SkeletonComponent,
  ],
})
export class DashboardComponent implements OnInit {
  private store = inject(Store);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private destroyRef = inject(DestroyRef);

  state$ = this.store.select(selectState);
  portfolios$ = this.store.select(selectPortfoliosDbo);
  selectedPortfolioIds$ = this.store.select(selectSelectedPortfolioIds);
  baseCurrency$ = this.store.select(selectBaseCurrency);
  loading$ = this.store.select(selectLoading);
  timeRange$ = this.store.select(selectTimeRange);
  plan$ = this.store.select(selectPlan);
  isPaidMember$ = this.store.select(selectIsPaidMember);

  ngOnInit(): void {
    // Fetch plan + usage so the badge and the chat's quota display are accurate.
    this.store.dispatch(loadStatus());

    // Returning from Stripe Checkout (success_url carries ?upgraded=1): the
    // webhook that flips `plan` to paid can land a beat after the redirect, so
    // re-poll a few times to surface the new badge/limit without a manual
    // refresh, then drop the query param.
    if (this.route.snapshot.queryParamMap.has('upgraded')) {
      timer(2000, 2500)
        .pipe(take(3), takeUntilDestroyed(this.destroyRef))
        .subscribe(() => this.store.dispatch(loadStatus()));
      this.router.navigate([], { queryParams: {}, replaceUrl: true });
    }
  }

  readonly ranges: TimeRange[] = ['1M', '3M', '6M', 'YTD', '1Y', '5Y', 'ALL'];
  readonly rangeLabels = TIME_RANGE_LABELS;

  isPortfolioActive(
    portfolioId: string,
    selectedIds: string[] | 'all',
  ): boolean {
    return selectedIds === 'all' || selectedIds.includes(portfolioId);
  }

  portfolioIds(portfolios: { id: string }[]): string[] {
    return portfolios.map((p) => p.id);
  }

  togglePortfolio(
    portfolioId: string,
    selectedIds: string[] | 'all',
    allIds: string[],
  ) {
    let current = selectedIds === 'all' ? [...allIds] : [...selectedIds];
    if (current.includes(portfolioId)) {
      current = current.filter((id) => id !== portfolioId);
    } else {
      current = [...current, portfolioId];
    }
    const ids = current.length === allIds.length ? 'all' : current;
    this.store.dispatch(setSelectedPortfolios({ ids }));
  }

  selectRange(range: TimeRange) {
    this.store.dispatch(setTimeRange({ range }));
  }

  currencySymbol(currency: string | null | undefined): string {
    return getCurrencySymbol(currency);
  }
}
