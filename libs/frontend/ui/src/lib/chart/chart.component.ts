import { Component, Input, OnChanges } from '@angular/core';
import { EChartsOption } from 'echarts';
import { NgxEchartsDirective } from 'ngx-echarts';
import { CommonModule, NgIf } from '@angular/common';

@Component({
  selector: 'aws-chart',
  templateUrl: './chart.component.html',
  styleUrls: ['./chart.component.scss'],
  imports: [
    NgxEchartsDirective,
    CommonModule
  ]
})
export class ChartComponent implements OnChanges {
  @Input() x: Date[] = [];
  @Input() y: number[] = [];
  @Input() label: string | undefined;
  @Input() money: boolean = true;
  @Input() showSymbols: boolean = false;

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
      grid: {
        containLabel: true,
      },
      tooltip: {
        trigger: this.showSymbols ? 'item' : 'axis',
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
        },
      ],
      yAxis: {
        type: 'value',
        axisLabel: {
          formatter: `{value}${this.money ? ' €' : ''}`,
        },
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
        },
      ],
    };
  }
}
