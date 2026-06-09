import { Component, Input, OnChanges } from '@angular/core';
import { EChartsOption } from 'echarts';
import { NgxEchartsDirective } from 'ngx-echarts';
import {
  axisStyle,
  baseGrid,
  baseTitle,
  baseTooltip,
  formatMoney,
  NAUTICAL_MUTED,
  NAUTICAL_TEXT,
  round2,
  scrollLegend,
  SERIES_COLORS,
} from '../chart-theme';

@Component({
  selector: 'aws-bar-chart-per-quarter-by-year',
  templateUrl: './bar-chart-per-quarter-by-year.component.html',
  styleUrls: ['./bar-chart-per-quarter-by-year.component.scss'],
  imports: [NgxEchartsDirective],
})
export class BarChartPerQuarterByYearComponent implements OnChanges {
  @Input() series: { year: string; data: number[] }[] = [];
  @Input() currencySymbol = '€';

  chartOptions: EChartsOption | undefined;

  ngOnChanges(): void {
    this.chartOptions = this.getChartOptions();
  }

  getChartOptions(): EChartsOption {
    return {
      backgroundColor: 'transparent',
      textStyle: { color: NAUTICAL_TEXT },
      title: baseTitle('Dividend'),
      grid: baseGrid(72),
      tooltip: baseTooltip('axis', {
        valueFormatter: (value) =>
          formatMoney(value as number, this.currencySymbol),
      }),
      legend: scrollLegend(
        40,
        this.series.map((serie) => serie.year),
      ),
      xAxis: {
        type: 'category',
        data: ['Q1', 'Q2', 'Q3', 'Q4'],
        axisLabel: { color: NAUTICAL_MUTED },
        axisLine: axisStyle.axisLine,
        axisTick: axisStyle.axisTick,
      },
      yAxis: {
        type: 'value',
        axisLabel: {
          formatter: `{value} ${this.currencySymbol}`,
          color: NAUTICAL_MUTED,
        },
        axisLine: axisStyle.axisLine,
        splitLine: axisStyle.splitLine,
      },
      series: this.series.map((serie, index) => ({
        name: serie.year,
        type: 'bar' as const,
        data: serie.data.map((value) => round2(value)),
        itemStyle: {
          color: SERIES_COLORS[index % SERIES_COLORS.length],
        },
      })),
    };
  }
}
