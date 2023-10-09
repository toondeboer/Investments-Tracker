import { Component, OnInit } from '@angular/core';
import { getData, selectState } from '@aws/state';
import { getTicker, selectYahoo } from '@aws/yahoo';
import { Store } from '@ngrx/store';

@Component({
  selector: 'aws-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss'],
})
export class DashboardComponent implements OnInit {
  state$ = this.store.select(selectState);
  yahoo$ = this.store.select(selectYahoo);

  constructor(private store: Store) {}

  ngOnInit(): void {
    this.store.dispatch(getData());
    this.store.dispatch(getTicker());
  }
}
