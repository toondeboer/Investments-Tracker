import { Component, OnInit } from '@angular/core';
import { addData, getData, selectState } from '@aws/state';
import { Store } from '@ngrx/store';

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

  increment() {
    this.store.dispatch(addData());
  }
}
