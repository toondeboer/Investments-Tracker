import { Component, Input, OnChanges } from '@angular/core';
import { EChartsOption } from 'echarts';
import { NgxEchartsDirective } from 'ngx-echarts';
import {
  axisStyle,
  baseGrid,
  baseTitle,
  baseTooltip,
  formatAxisDate,
  formatMoney,
  NAUTICAL_GOLD,
  NAUTICAL_MUTED,
  NAUTICAL_TEXT,
  round2,
  spanDays,
} from '../chart-theme';

@Component({
  selector: 'aws-chart',
  templateUrl: './chart.component.html',
  styleUrls: ['./chart.component.scss'],
  imports: [NgxEchartsDirective],
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
    const symbol = this.money ? this.currencySymbol : undefined;
    const span = spanDays(this.x);
    // [timestamp, value] pairs let echarts' time axis pick relevant, period-aware
    // ticks. NaN values (hidden quarters / gaps) keep their slot but draw nothing.
    const data: [number, number][] = this.x.map((d, i) => [
      d.getTime(),
      round2(this.y[i]),
    ]);

    return {
      backgroundColor: 'transparent',
      color: [
        NAUTICAL_GOLD,
        '#1E6091',
        '#2ECC71',
        '#E8D5B7',
        NAUTICAL_MUTED,
        '#E74C3C',
      ],
      textStyle: { color: NAUTICAL_TEXT },
      title: baseTitle(this.label),
      grid: baseGrid(56),
      tooltip: baseTooltip(this.showSymbols ? 'item' : 'axis', {
        formatter: (params) => {
          const list = Array.isArray(params) ? params : [params];
          if (list.length === 0) {
            return '';
          }
          const value = list[0].value as [number, number];
          const header = formatAxisDate(value[0], span);
          const rows = list
            .map((p) => {
              const v = (p.value as [number, number])[1];
              return `${p.marker ?? ''} ${formatMoney(v, symbol)}`;
            })
            .join('<br/>');
          return `${header}<br/>${rows}`;
        },
      }),
      xAxis: {
        type: 'time',
        ...axisStyle,
      },
      yAxis: {
        type: 'value',
        axisLabel: {
          formatter: `{value}${this.money ? ' ' + this.currencySymbol : ''}`,
          color: NAUTICAL_MUTED,
        },
        axisLine: axisStyle.axisLine,
        splitLine: axisStyle.splitLine,
      },
      series: [
        {
          data,
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
              x: 0,
              y: 0,
              x2: 0,
              y2: 1,
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
