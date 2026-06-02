import { Component, Input, OnChanges } from '@angular/core';
import { EChartsOption } from 'echarts';
import { NgxEchartsDirective } from 'ngx-echarts';
import { CommonModule, NgIf } from '@angular/common';

const NAUTICAL_TEXT  = '#F5F0E8';
const NAUTICAL_MUTED = '#8FA8C0';
const NAUTICAL_GOLD  = '#C9A84C';
const NAUTICAL_GRID  = 'rgba(201,168,76,0.1)';

@Component({
  selector: 'aws-chart',
  templateUrl: './chart.component.html',
  styleUrls: ['./chart.component.scss'],
  imports: [NgxEchartsDirective, CommonModule],
})
export class ChartComponent implements OnChanges {
  @Input() x: Date[] = [];
  @Input() y: number[] = [];
  @Input() label: string | undefined;
  @Input() money = true;
  @Input() showSymbols = false;
  @Input() currencySymbol = '€';

  chartOptions: EChartsOption | undefined;

  ngOnChanges() {
    this.chartOptions = this.getChartOptions();
  }

  getChartOptions(): EChartsOption {
    return {
      backgroundColor: 'transparent',
      color: [NAUTICAL_GOLD, '#1E6091', '#2ECC71', '#E8D5B7', NAUTICAL_MUTED, '#E74C3C'],
      textStyle: { color: NAUTICAL_TEXT },
      title: {
        left: 'center',
        text: this.label,
        textStyle: { color: NAUTICAL_TEXT },
      },
      grid: {
        top: 48,
        containLabel: true,
      },
      tooltip: {
        trigger: this.showSymbols ? 'item' : 'axis',
        backgroundColor: '#0F2035',
        borderColor: NAUTICAL_GOLD,
        textStyle: { color: NAUTICAL_TEXT },
        axisPointer: {
          type: 'shadow',
        },
      },
      xAxis: [
        {
          type: 'category',
          show: false,
          data: this.x.map(
            (x) =>
              `${x.getDate()} ${x.toLocaleString('en-US', {
                month: 'short',
              })} ${x.getFullYear()}`
          ),
          axisLine: { lineStyle: { color: NAUTICAL_GRID } },
          axisLabel: { color: NAUTICAL_MUTED },
        },
        {
          type: 'category',
          position: 'bottom',
          data: this.x.map(
            (x) =>
              `${x.toLocaleString('en-US', {
                month: 'short',
              })} '${x.getFullYear().toString().slice(2, 4)}`
          ),
          axisLine: { lineStyle: { color: NAUTICAL_GRID } },
          axisLabel: { color: NAUTICAL_MUTED },
          axisTick: { lineStyle: { color: NAUTICAL_GRID } },
        },
      ],
      yAxis: {
        type: 'value',
        axisLabel: {
          formatter: `{value}${this.money ? ' ' + this.currencySymbol : ''}`,
          color: NAUTICAL_MUTED,
        },
        axisLine: { lineStyle: { color: NAUTICAL_GRID } },
        splitLine: { lineStyle: { color: NAUTICAL_GRID } },
      },
      series: [
        {
          data: this.y.map((value) => Math.round(value * 100) / 100),
          type: 'line',
          connectNulls: true,
          smooth: true,
          symbol: this.showSymbols ? 'emptyCircle' : 'circle',
          symbolSize: this.showSymbols ? 10 : 1,
          showAllSymbol: true,
          lineStyle: { color: NAUTICAL_GOLD, width: 2 },
          itemStyle: { color: NAUTICAL_GOLD },
          areaStyle: {
            color: {
              type: 'linear',
              x: 0, y: 0, x2: 0, y2: 1,
              colorStops: [
                { offset: 0, color: 'rgba(201,168,76,0.3)' },
                { offset: 1, color: 'rgba(201,168,76,0.02)' },
              ],
            },
          },
        },
      ],
    };
  }
}
