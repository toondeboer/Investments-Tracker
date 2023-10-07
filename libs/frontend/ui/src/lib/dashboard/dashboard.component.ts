import { Component, OnInit } from '@angular/core';
import { getData, selectState } from '@aws/state';
import { Store } from '@ngrx/store';
import { EChartsOption } from 'echarts';

@Component({
  selector: 'aws-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss'],
})
export class DashboardComponent implements OnInit {
  state$ = this.store.select(selectState);

  constructor(private store: Store) {}

  ngOnInit(): void {
    this.store.dispatch(getData());
  }
}
