import { Component, Input } from '@angular/core';
import { ChartData } from '@aws/util';
import { selectYahoo } from '@aws/yahoo';
import { Store } from '@ngrx/store';
import { ChartComponent } from '../chart/chart.component';
import { BarAndLineChartComponent } from '../bar-and-line-chart/bar-and-line-chart.component';
import { BarChartPerQuarterByYear } from '../bar-chart-per-quarter-by-year/bar-chart-per-quarter-by-year';
import { BarChartComponent } from '../bar-chart/bar-chart.component';
import { AsyncPipe, CommonModule } from '@angular/common';

@Component({
  selector: 'aws-yahoo',
  templateUrl: './yahoo.component.html',
  styleUrls: ['./yahoo.component.scss'],
  imports: [
    ChartComponent,
    BarAndLineChartComponent,
    BarChartPerQuarterByYear,
    BarChartComponent,
    AsyncPipe,
    CommonModule
  ]
})
export class YahooComponent {
  @Input() dates: Date[] = [];
  @Input() chartData: ChartData | undefined;

  yahoo$ = this.store.select(selectYahoo);

  constructor(private store: Store) {}
}
