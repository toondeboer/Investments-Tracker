import { Component, Input, OnChanges } from '@angular/core';
import { EChartsOption } from 'echarts';
import { NgxEchartsDirective } from 'ngx-echarts';
import {
  axisStyle,
  baseGrid,
  baseTitle,
  baseTooltip,
  NAUTICAL_GOLD,
  NAUTICAL_MUTED,
  NAUTICAL_OCEAN,
  NAUTICAL_TEXT,
  round2,
  scrollLegend,
} from '../chart-theme';

@Component({
  selector: 'aws-bar-chart',
  templateUrl: './bar-chart.component.html',
  styleUrls: ['./bar-chart.component.scss'],
  imports: [NgxEchartsDirective],
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
      title: baseTitle('Annual Return'),
      grid: baseGrid(72),
      tooltip: baseTooltip('axis', {
        // Per-series units: '%' for the return bar, currency for the profit line.
        formatter: (params) => {
          const list = Array.isArray(params) ? params : [params];
          if (!list.length) {
            return '';
          }
          const rows = list
            .map((p) => {
              const unit =
                p.seriesName === 'Profit' ? ` ${this.currencySymbol}` : ' %';
              return `${p.marker ?? ''} ${p.seriesName}: ${round2(p.value as number)}${unit}`;
            })
            .join('<br/>');
          return `${list[0].name}<br/>${rows}`;
        },
      }),
      legend: scrollLegend(40),
      xAxis: {
        type: 'category',
        data: this.series.years,
        axisLabel: { color: NAUTICAL_MUTED },
        axisLine: axisStyle.axisLine,
        axisTick: axisStyle.axisTick,
      },
      yAxis: [
        {
          type: 'value',
          axisLabel: { formatter: '{value} %', color: NAUTICAL_MUTED },
          axisLine: axisStyle.axisLine,
          splitLine: axisStyle.splitLine,
        },
        {
          type: 'value',
          position: 'right',
          axisLabel: {
            formatter: `{value} ${this.currencySymbol}`,
            color: NAUTICAL_MUTED,
          },
          axisLine: axisStyle.axisLine,
          splitLine: { show: false },
        },
      ],
      series: [
        {
          name: 'Annual Return %',
          type: 'bar',
          data: this.series.yields.map((value) => round2(value)),
          itemStyle: { color: NAUTICAL_GOLD },
        },
        {
          name: 'Profit',
          type: 'line',
          yAxisIndex: 1,
          data: this.series.profit.map((value) => round2(value)),
          itemStyle: { color: NAUTICAL_OCEAN },
          lineStyle: { color: NAUTICAL_OCEAN, width: 2 },
          smooth: true,
        },
      ],
    };
  }
}
