import { Component, DestroyRef, Input, OnInit, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { LucideAngularModule } from 'lucide-angular';
import { SkeletonComponent } from '../skeleton/skeleton.component';
import { Store } from '@ngrx/store';
import { filter, take } from 'rxjs';
import { selectState } from '@aws/state';
import {
  loadInsights,
  selectInsight,
  selectInsightLoading,
} from '@aws/captain';
import { parseInsightNarrative } from './insight-narrative';

/**
 * The dashboard's "Captain's read": a short, auto-generated narrative about the
 * portfolio. The result is cached per day + portfolio (in the captain slice /
 * localStorage), so this triggers at most one OpenAI call per day. In demo mode
 * it renders a static narrative with no network call.
 */
@Component({
  selector: 'aws-insights-banner',
  standalone: true,
  imports: [CommonModule, LucideAngularModule, SkeletonComponent],
  templateUrl: './insights-banner.component.html',
  styleUrls: ['./insights-banner.component.scss'],
})
export class InsightsBannerComponent implements OnInit {
  /** When true, render the static demo narrative and never call the Lambda. */
  @Input() demo = false;

  private store = inject(Store);
  private destroyRef = inject(DestroyRef);

  insight$ = this.store.select(selectInsight);
  loading$ = this.store.select(selectInsightLoading);

  /** Turn the markdown-flavoured narrative into render-ready, tinted segments. */
  readonly parseNarrative = parseInsightNarrative;

  ngOnInit(): void {
    if (this.demo) {
      this.store.dispatch(loadInsights({ demo: true }));
      return;
    }
    // Wait until the portfolio has a real value (prices loaded) before asking,
    // so the narrative reflects funded holdings and we spend only once.
    this.store
      .select(selectState)
      .pipe(
        filter((state) => state.summary.portfolioValue > 0),
        take(1),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe(() => this.store.dispatch(loadInsights({})));
  }
}
