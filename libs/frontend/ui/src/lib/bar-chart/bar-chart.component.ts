import { Component, Input, OnChanges } from '@angular/core';
import { EChartsOption } from 'echarts';

const colors = [
  '#4CAF50',
  '#FF9800',
  '#2196F3',
  '#F44336',
  '#9C27B0',
  '#FFC107',
];

@Component({
  selector: 'aws-bar-chart',
  templateUrl: './bar-chart.component.html',
  styleUrls: ['./bar-chart.component.scss'],
})
export class BarChartComponent implements OnChanges {
  @Input() series: { year: string; data: number[] }[] = [];

  chartOptions: EChartsOption | undefined;

  ngOnChanges(): void {
    this.chartOptions = this.getChartOptions();
  }

  getChartOptions(): EChartsOption {
    return {
      title: {
        left: 'center',
        text: 'Dividend',
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
        data: this.series.map((serie) => serie.year),
      },
      xAxis: {
        type: 'category',
        data: ['Q1', 'Q2', 'Q3', 'Q4'],
        axisLabel: {
          formatter: (value: string) => `${value}`,
        },
      },
      yAxis: {
        type: 'value',
        axisLabel: {
          formatter: '{value} €',
        },
      },
      series: this.series.map((serie, index) => ({
        name: serie.year,
        type: 'bar',
        data: serie.data,
        itemStyle: {
          color: colors[index % colors.length],
        },
      })),
    };
  }
}
