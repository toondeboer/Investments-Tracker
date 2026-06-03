import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { Summary, YearQuarter } from '@aws/util';
import { ChartComponent } from '../chart/chart.component';
import { BarChartComponent } from '../bar-chart/bar-chart.component';
import { BarAndLineChartComponent } from '../bar-and-line-chart/bar-and-line-chart.component';
import { BarChartPerQuarterByYearComponent } from '../bar-chart-per-quarter-by-year/bar-chart-per-quarter-by-year.component';
import { SummaryComponent } from '../summary/summary.component';
import { ScrollingTextComponent } from '../scrolling-text/scrolling-text.component';
import { InsightsBannerComponent } from '../insights-banner/insights-banner.component';
import { CaptainPanelComponent } from '../captain-panel/captain-panel.component';
import { DialogService } from '../dialog/dialog.service';
import {
  buildDemoAnnualReturns,
  buildDemoQuarterlyDividends,
  buildDemoSeries,
  buildDemoSummary,
  buildDemoTtmDividends,
  DemoSeries,
} from './demo-data';

/**
 * Public, no-account demo of the sailor dashboard. Everything is driven by the
 * static {@link buildDemoSeries} generator — no backend, NgRx, auth or Yahoo
 * calls — so visitors can see exactly what kind of insights to expect.
 */
@Component({
  selector: 'aws-demo',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    LucideAngularModule,
    ChartComponent,
    BarChartComponent,
    BarAndLineChartComponent,
    BarChartPerQuarterByYearComponent,
    SummaryComponent,
    ScrollingTextComponent,
    InsightsBannerComponent,
  ],
  templateUrl: './demo.component.html',
  styleUrl: './demo.component.scss',
})
export class DemoComponent {
  private readonly dialog = inject(DialogService);

  readonly currency = 'EUR';
  readonly currencySymbol = '€';

  private readonly series: DemoSeries = buildDemoSeries();

  readonly summary: Summary = buildDemoSummary(this.series);
  readonly dates: Date[] = this.series.dates;
  readonly portfolioValues: number[] = this.series.portfolioValues;
  readonly invested: number[] = this.series.invested;
  readonly profit: number[] = this.series.profit;
  readonly cumulativeDividend: number[] = this.series.cumulativeDividend;
  readonly cumulativeCommission: number[] = this.series.cumulativeCommission;

  readonly annualReturns: { years: string[]; yields: number[]; profit: number[] } =
    buildDemoAnnualReturns();
  readonly quarterlyDividends: { year: string; data: number[] }[] =
    buildDemoQuarterlyDividends();
  readonly ttmDividends: { yearQuarters: YearQuarter[]; dividends: number[] } =
    buildDemoTtmDividends();

  // Opens "Ask the Captain" in demo mode — canned, offline replies, no API call.
  openCaptain(): void {
    this.dialog.open(CaptainPanelComponent, {
      width: '440px',
      data: { demo: true },
    });
  }
}
