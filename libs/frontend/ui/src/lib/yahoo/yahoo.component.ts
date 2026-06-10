import { Component, Input, inject } from '@angular/core';
import { ChartData, YearQuarter } from '@aws/util';
import { selectYahoo } from '@aws/yahoo';
import { Store } from '@ngrx/store';
import { ChartComponent } from '../chart/chart.component';
import { BarAndLineChartComponent } from '../bar-and-line-chart/bar-and-line-chart.component';
import { BarChartPerQuarterByYearComponent } from '../bar-chart-per-quarter-by-year/bar-chart-per-quarter-by-year.component';
import { BarChartComponent } from '../bar-chart/bar-chart.component';
import { AsyncPipe, CommonModule } from '@angular/common';

@Component({
  selector: 'aws-yahoo',
  templateUrl: './yahoo.component.html',
  styleUrls: ['./yahoo.component.scss'],
  imports: [
    ChartComponent,
    BarAndLineChartComponent,
    BarChartPerQuarterByYearComponent,
    BarChartComponent,
    AsyncPipe,
    CommonModule,
  ],
})
export class YahooComponent {
  private store = inject(Store);

  @Input() dates: Date[] = [];
  @Input() chartData: ChartData | undefined;
  @Input() currencySymbol = '€';

  yahoo$ = this.store.select(selectYahoo);

  protected readonly Object = Object;

  /** Last day of each quarter (e.g. Q0 → March 31) for use as x-axis dates. */
  quarterDates(yearQuarters: YearQuarter[]): Date[] {
    return yearQuarters.map(
      ({ year, quarter }) =>
        new Date(Date.UTC(parseInt(year), (quarter + 1) * 3, 0)),
    );
  }

  /** Map 0-dividend quarters to NaN so the chart only draws dots on active quarters. */
  quarterValues(dividends: number[]): number[] {
    return dividends.map((v) => (v === 0 ? NaN : v));
  }
}
