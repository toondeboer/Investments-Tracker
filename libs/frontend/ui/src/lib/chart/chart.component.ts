import { Component, Input, OnChanges } from '@angular/core';
import { EChartsOption } from 'echarts';

@Component({
  selector: 'aws-chart',
  templateUrl: './chart.component.html',
  styleUrls: ['./chart.component.scss'],
})
export class ChartComponent implements OnChanges {
  @Input() x: Date[] = [];
  @Input() y: number[] = [];

  chartOptions: EChartsOption | undefined;

  ngOnChanges() {
    this.chartOptions = this.getChartOptions();
  }

  getChartOptions(): EChartsOption {
    return {
      xAxis: {
        type: 'category',
        data: this.x.map((x) => x.toDateString()),
      },
      yAxis: {
        type: 'value',
      },
      series: [
        {
          data: this.y,
          type: 'line',
        },
      ],
    };
  }
}
