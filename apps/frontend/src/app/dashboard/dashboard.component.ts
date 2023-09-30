import { Component, OnInit } from '@angular/core';
import { addData, getData, selectValue } from '@aws/state';
import { Store } from '@ngrx/store';

@Component({
  selector: 'aws-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss'],
})
export class DashboardComponent implements OnInit {
  value$ = this.store.select(selectValue);

  constructor(private store: Store) {
    this.store.dispatch(getData());
  }

  ngOnInit(): void {
    this.store.dispatch(getData());
  }

  increment() {
    this.store.dispatch(addData());
  }
}
