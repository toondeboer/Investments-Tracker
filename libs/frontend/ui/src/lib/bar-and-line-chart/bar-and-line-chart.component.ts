import { Component, Input, OnChanges } from '@angular/core';
import { EChartsOption } from 'echarts';
import { YearQuarter } from '@aws/util';
import { NgxEchartsDirective } from 'ngx-echarts';
import { CommonModule, NgIf } from '@angular/common';

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

  chartOptions: EChartsOption | undefined;

  ngOnChanges() {
    if (this.series.yearQuarters.length !== this.series.dividends.length) {
      console.log(`WARNING: X and Y are not the same size.`);
    }
    this.chartOptions = this.getChartOptions();
  }

  getChartOptions(): EChartsOption {
    return {
      title: {
        left: 'center',
        text: 'TTM Dividend',
      },
      grid: {
        containLabel: true,
      },
      tooltip: {
        trigger: 'axis',
        axisPointer: {
          type: 'shadow',
        },
      },
      legend: {
        top: '8%',
      },
      xAxis: {
        type: 'category',
        data: this.series.yearQuarters.map((x) => {
          if (x.quarter === 0) {
            return `'${x.year.slice(2, 4)}`;
          }
          return `Q${x.quarter + 1}`;
        }),
      },
      yAxis: {
        type: 'value',
        axisLabel: {
          formatter: '{value} €',
        },
      },
      series: [
        {
          name: 'Yearly',
          data: this.series.dividends.map(
            (dividend) => Math.round(dividend * 100) / 100
          ),
          type: 'bar',
          itemStyle: {
            color: '#4CAF50',
          },
        },
        {
          name: 'Monthly',
          data: this.series.dividends.map(
            (dividend) => Math.round((dividend * 100) / 3) / 100
          ),
          type: 'line',
          connectNulls: true,
          smooth: true,
          itemStyle: {
            color: '#FF9800',
          },
        },
        {
          name: 'Daily',
          data: this.series.dividends.map(
            (dividend) => Math.round((dividend * 100) / (3 * 30)) / 100
          ),
          type: 'line',
          connectNulls: true,
          smooth: true,
          itemStyle: {
            color: '#2196F3',
          },
        },
        {
          name: 'Hourly',
          data: this.series.dividends.map(
            (dividend) => Math.round((dividend * 100) / (3 * 30 * 24)) / 100
          ),
          type: 'line',
          connectNulls: true,
          smooth: true,
          itemStyle: {
            color: '#F44336',
          },
        },
      ],
    };
  }
}
