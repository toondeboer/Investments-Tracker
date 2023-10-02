import { Component, OnInit } from '@angular/core';
import { addData, selectState } from '@aws/state';
import { Store } from '@ngrx/store';
import { EChartsOption } from 'echarts';

@Component({
  selector: 'aws-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss'],
})
export class DashboardComponent implements OnInit {
  state$ = this.store.select(selectState);

  chartOption: EChartsOption = {
    xAxis: {
      type: 'category',
      data: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    },
    yAxis: {
      type: 'value',
    },
    series: [
      {
        data: [820, 932, 901, 934, 1290, 1330, 1320],
        type: 'line',
      },
    ],
  };

  constructor(private store: Store) {}

  ngOnInit(): void {
    return;
    // this.store.dispatch(getData());
  }

  increment() {
    this.store.dispatch(addData());
  }
}
