import { Component, Input, OnInit } from '@angular/core';
import { ChartData } from '@aws/util';
import { EChartsOption } from 'echarts';

@Component({
  selector: 'aws-chart',
  templateUrl: './chart.component.html',
  styleUrls: ['./chart.component.scss'],
})
export class ChartComponent implements OnInit {
  @Input() chartData: ChartData | undefined;

  chartOption: EChartsOption;

  constructor() {
    this.chartOption = {
      xAxis: {
        type: 'category',
        data: this.chartData?.x,
      },
      yAxis: {
        type: 'value',
      },
      series: [
        {
          data: this.chartData?.data,
          type: 'line',
        },
      ],
    };
  }
  ngOnInit(): void {
    this.chartOption = {
      xAxis: {
        type: 'category',
        data: this.chartData?.x,
      },
      yAxis: {
        type: 'value',
      },
      series: [
        {
          data: this.chartData?.data,
          type: 'line',
        },
      ],
    };
  }
}
