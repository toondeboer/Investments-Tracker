import { Component, Input, OnChanges } from '@angular/core';
import { Transaction, transactionToChartData } from '@aws/util';
import { EChartsOption } from 'echarts';

@Component({
  selector: 'aws-transaction-chart',
  templateUrl: './transaction-chart.component.html',
  styleUrls: ['./transaction-chart.component.scss'],
})
export class TransactionChartComponent implements OnChanges {
  @Input() transactions: Transaction[] = [];

  chartOptions: EChartsOption | undefined;

  ngOnChanges() {
    this.chartOptions = this.getChartOptions();
  }

  getChartData(transactions: Transaction[]) {
    return transactionToChartData(transactions);
  }

  getChartOptions(): EChartsOption {
    const chartData = this.getChartData(this.transactions);
    return {
      xAxis: {
        type: 'category',
        data: chartData.x,
      },
      yAxis: {
        type: 'value',
      },
      series: [
        {
          data: chartData.data,
          type: 'line',
        },
      ],
    };
  }
}
