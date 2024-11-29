import { Component, Input, OnChanges } from '@angular/core';
import { EChartsOption } from 'echarts';
import { NgxEchartsDirective } from 'ngx-echarts';
import { CommonModule, NgIf } from '@angular/common';

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

  chartOptions: EChartsOption | undefined;

  ngOnChanges(): void {
    this.chartOptions = this.getChartOptions();
  }

  getChartOptions(): EChartsOption {
    return {
      title: {
        left: 'center',
        text: 'Yield',
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
        top: '10%',
      },
      xAxis: {
        type: 'category',
        data: this.series.years,
      },
      yAxis: [
        {
          type: 'value',
          axisLabel: {
            formatter: '{value} %',
          },
        },
        {
          type: 'value',
          position: 'right',
          axisLabel: {
            formatter: '{value} €',
          },
        },
      ],
      series: [
        {
          name: 'Yield %',
          type: 'bar',
          data: this.series.yields.map(
            (value) => Math.round(value * 100) / 100
          ),
          itemStyle: {
            color: '#4CAF50',
          },
        },
        {
          name: 'Profit',
          type: 'line',
          yAxisIndex: 1,
          data: this.series.profit.map(
            (value) => Math.round(value * 100) / 100
          ),
          itemStyle: {
            color: '#FF9800',
          },
        },
      ],
    };
  }
}
