import { Component, Input, OnChanges } from '@angular/core';
import { EChartsOption } from 'echarts';
import { YearQuarter } from '@aws/util';
import { NgxEchartsDirective } from 'ngx-echarts';
import {
  axisStyle,
  baseGrid,
  baseTitle,
  baseTooltip,
  formatMoney,
  NAUTICAL_GOLD,
  NAUTICAL_MUTED,
  NAUTICAL_TEXT,
  round2,
  scrollLegend,
} from '../chart-theme';

// The bar series is a trailing-twelve-month (annual) dividend figure, so the
// derived rate lines divide the annual amount down to each interval.
const MONTHS_PER_YEAR = 12;
const DAYS_PER_YEAR = 365;
const HOURS_PER_YEAR = DAYS_PER_YEAR * 24;

@Component({
  selector: 'aws-bar-and-line-chart',
  templateUrl: './bar-and-line-chart.component.html',
  styleUrls: ['./bar-and-line-chart.component.scss'],
  imports: [
    NgxEchartsDirective
]
})
export class BarAndLineChartComponent implements OnChanges {
  @Input() series: { yearQuarters: YearQuarter[]; dividends: number[] } = {
    yearQuarters: [],
    dividends: [],
  };
  @Input() currencySymbol = '€';

  chartOptions: EChartsOption | undefined;

  ngOnChanges() {
    this.chartOptions = this.getChartOptions();
  }

  getChartOptions(): EChartsOption {
    return {
      backgroundColor: 'transparent',
      textStyle: { color: NAUTICAL_TEXT },
      title: baseTitle('TTM Dividend'),
      grid: baseGrid(72),
      tooltip: baseTooltip('axis', {
        valueFormatter: (value) => formatMoney(value as number, this.currencySymbol),
      }),
      legend: scrollLegend(40),
      xAxis: {
        type: 'category',
        data: this.series.yearQuarters.map((x) => {
          if (x.quarter === 0) {
            return `'${x.year.slice(2, 4)}`;
          }
          return `Q${x.quarter + 1}`;
        }),
        axisLabel: { color: NAUTICAL_MUTED },
        axisLine: axisStyle.axisLine,
        axisTick: axisStyle.axisTick,
      },
      yAxis: {
        type: 'value',
        axisLabel: { formatter: `{value} ${this.currencySymbol}`, color: NAUTICAL_MUTED },
        axisLine: axisStyle.axisLine,
        splitLine: axisStyle.splitLine,
      },
      series: [
        {
          name: 'Yearly',
          data: this.series.dividends.map((dividend) => round2(dividend)),
          type: 'bar',
          itemStyle: { color: NAUTICAL_GOLD },
        },
        {
          name: 'Monthly',
          data: this.series.dividends.map((dividend) => round2(dividend / MONTHS_PER_YEAR)),
          type: 'line',
          connectNulls: true,
          smooth: true,
          itemStyle: { color: '#1E6091' },
          lineStyle: { color: '#1E6091', width: 2 },
        },
        {
          name: 'Daily',
          data: this.series.dividends.map((dividend) => round2(dividend / DAYS_PER_YEAR)),
          type: 'line',
          connectNulls: true,
          smooth: true,
          itemStyle: { color: '#2ECC71' },
          lineStyle: { color: '#2ECC71', width: 2 },
        },
        {
          name: 'Hourly',
          data: this.series.dividends.map((dividend) => round2(dividend / HOURS_PER_YEAR)),
          type: 'line',
          connectNulls: true,
          smooth: true,
          itemStyle: { color: '#E8D5B7' },
          lineStyle: { color: '#E8D5B7', width: 2 },
        },
      ],
    };
  }
}
