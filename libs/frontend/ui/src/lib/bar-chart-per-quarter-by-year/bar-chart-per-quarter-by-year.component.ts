import { Component, Input, OnChanges } from '@angular/core';
import { EChartsOption } from 'echarts';
import { NgxEchartsDirective } from 'ngx-echarts';
import { CommonModule, NgIf } from '@angular/common';

const NAUTICAL_TEXT  = '#F5F0E8';
const NAUTICAL_MUTED = '#8FA8C0';
const NAUTICAL_GOLD  = '#C9A84C';
const NAUTICAL_GRID  = 'rgba(201,168,76,0.1)';

const colors = [
  '#C9A84C',  // antique gold
  '#1E6091',  // ocean blue
  '#2ECC71',  // success green
  '#E8D5B7',  // sand
  '#8FA8C0',  // muted blue
  '#E74C3C',  // coral red
];

@Component({
  selector: 'aws-bar-chart-per-quarter-by-year',
  templateUrl: './bar-chart-per-quarter-by-year.component.html',
  styleUrls: ['./bar-chart-per-quarter-by-year.component.scss'],
  imports: [
    NgxEchartsDirective,
    CommonModule
  ]
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
      title: {
        left: 'center',
        text: 'Dividend',
        textStyle: { color: NAUTICAL_TEXT },
      },
      grid: { containLabel: true },
      tooltip: {
        trigger: 'axis',
        backgroundColor: '#0F2035',
        borderColor: NAUTICAL_GOLD,
        textStyle: { color: NAUTICAL_TEXT },
        axisPointer: { type: 'shadow' },
      },
      legend: {
        top: '10%',
        data: this.series.map((serie) => serie.year),
        textStyle: { color: NAUTICAL_MUTED },
      },
      xAxis: {
        type: 'category',
        data: ['Q1', 'Q2', 'Q3', 'Q4'],
        axisLabel: { formatter: (value: string) => `${value}`, color: NAUTICAL_MUTED },
        axisLine: { lineStyle: { color: NAUTICAL_GRID } },
        axisTick: { lineStyle: { color: NAUTICAL_GRID } },
      },
      yAxis: {
        type: 'value',
        axisLabel: { formatter: `{value} ${this.currencySymbol}`, color: NAUTICAL_MUTED },
        axisLine: { lineStyle: { color: NAUTICAL_GRID } },
        splitLine: { lineStyle: { color: NAUTICAL_GRID } },
      },
      series: this.series.map((serie, index) => ({
        name: serie.year,
        type: 'bar' as const,
        data: serie.data,
        itemStyle: {
          color: colors[index % colors.length],
        },
      })),
    };
  }
}
