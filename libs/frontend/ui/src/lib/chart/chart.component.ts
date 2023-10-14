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
  @Input() label: string | undefined;

  chartOptions: EChartsOption | undefined;

  ngOnChanges() {
    if (this.x.length !== this.y.length) {
      console.log(`WARNING: X and Y are not the same size.`);
    }
    this.chartOptions = this.getChartOptions();
  }

  getChartOptions(): EChartsOption {
    return {
      title: {
        left: 'center',
        text: this.label,
      },
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
          connectNulls: true,
          smooth: true,
        },
      ],
    };
  }
}
