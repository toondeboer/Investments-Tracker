import { Component, Input, OnChanges } from '@angular/core';
import { EChartsOption } from 'echarts';
import { YearQuarter } from '@aws/util';
import { NgxEchartsDirective } from 'ngx-echarts';
import { CommonModule, NgIf } from '@angular/common';

const NAUTICAL_TEXT  = '#F5F0E8';
const NAUTICAL_MUTED = '#8FA8C0';
const NAUTICAL_GOLD  = '#C9A84C';
const NAUTICAL_GRID  = 'rgba(201,168,76,0.1)';

@Component({
  selector: 'aws-bar-and-line-chart',
  templateUrl: './bar-and-line-chart.component.html',
  styleUrls: ['./bar-and-line-chart.component.scss'],
  imports: [
    NgxEchartsDirective,
    CommonModule
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
      title: {
        left: 'center',
        text: 'TTM Dividend',
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
        top: '8%',
        textStyle: { color: NAUTICAL_MUTED },
      },
      xAxis: {
        type: 'category',
        data: this.series.yearQuarters.map((x) => {
          if (x.quarter === 0) {
            return `'${x.year.slice(2, 4)}`;
          }
          return `Q${x.quarter + 1}`;
        }),
        axisLine: { lineStyle: { color: NAUTICAL_GRID } },
        axisLabel: { color: NAUTICAL_MUTED },
        axisTick: { lineStyle: { color: NAUTICAL_GRID } },
      },
      yAxis: {
        type: 'value',
        axisLabel: { formatter: `{value} ${this.currencySymbol}`, color: NAUTICAL_MUTED },
        axisLine: { lineStyle: { color: NAUTICAL_GRID } },
        splitLine: { lineStyle: { color: NAUTICAL_GRID } },
      },
      series: [
        {
          name: 'Yearly',
          data: this.series.dividends.map((dividend) => Math.round(dividend * 100) / 100),
          type: 'bar',
          itemStyle: { color: NAUTICAL_GOLD },
        },
        {
          name: 'Monthly',
          data: this.series.dividends.map((dividend) => Math.round((dividend * 100) / 3) / 100),
          type: 'line',
          connectNulls: true,
          smooth: true,
          itemStyle: { color: '#1E6091' },
          lineStyle: { color: '#1E6091', width: 2 },
        },
        {
          name: 'Daily',
          data: this.series.dividends.map((dividend) => Math.round((dividend * 100) / (3 * 30)) / 100),
          type: 'line',
          connectNulls: true,
          smooth: true,
          itemStyle: { color: '#2ECC71' },
          lineStyle: { color: '#2ECC71', width: 2 },
        },
        {
          name: 'Hourly',
          data: this.series.dividends.map((dividend) => Math.round((dividend * 100) / (3 * 30 * 24)) / 100),
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
