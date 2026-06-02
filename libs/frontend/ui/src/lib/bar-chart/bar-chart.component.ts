import { Component, Input, OnChanges } from '@angular/core';
import { EChartsOption } from 'echarts';
import { NgxEchartsDirective } from 'ngx-echarts';
import { CommonModule, NgIf } from '@angular/common';

const NAUTICAL_TEXT  = '#F5F0E8';
const NAUTICAL_MUTED = '#8FA8C0';
const NAUTICAL_GOLD  = '#C9A84C';
const NAUTICAL_OCEAN = '#1E6091';
const NAUTICAL_GRID  = 'rgba(201,168,76,0.1)';

@Component({
  selector: 'aws-bar-chart',
  templateUrl: './bar-chart.component.html',
  styleUrls: ['./bar-chart.component.scss'],
  imports: [
    NgxEchartsDirective,
    CommonModule
  ]
})
export class BarChartComponent implements OnChanges {
  @Input() series: { years: string[]; yields: number[]; profit: number[] } = {
    years: [],
    yields: [],
    profit: [],
  };
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
        text: 'Yield',
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
        textStyle: { color: NAUTICAL_MUTED },
      },
      xAxis: {
        type: 'category',
        data: this.series.years,
        axisLine: { lineStyle: { color: NAUTICAL_GRID } },
        axisLabel: { color: NAUTICAL_MUTED },
        axisTick: { lineStyle: { color: NAUTICAL_GRID } },
      },
      yAxis: [
        {
          type: 'value',
          axisLabel: { formatter: '{value} %', color: NAUTICAL_MUTED },
          axisLine: { lineStyle: { color: NAUTICAL_GRID } },
          splitLine: { lineStyle: { color: NAUTICAL_GRID } },
        },
        {
          type: 'value',
          position: 'right',
          axisLabel: { formatter: `{value} ${this.currencySymbol}`, color: NAUTICAL_MUTED },
          axisLine: { lineStyle: { color: NAUTICAL_GRID } },
          splitLine: { show: false },
        },
      ],
      series: [
        {
          name: 'Yield %',
          type: 'bar',
          data: this.series.yields.map((value) => Math.round(value * 100) / 100),
          itemStyle: { color: NAUTICAL_GOLD },
        },
        {
          name: 'Profit',
          type: 'line',
          yAxisIndex: 1,
          data: this.series.profit.map((value) => Math.round(value * 100) / 100),
          itemStyle: { color: NAUTICAL_OCEAN },
          lineStyle: { color: NAUTICAL_OCEAN, width: 2 },
          smooth: true,
        },
      ],
    };
  }
}
