import { Component, OnInit } from '@angular/core';
import { getData, selectState } from '@aws/state';
import { Store } from '@ngrx/store';

@Component({
  selector: 'aws-transactions',
  templateUrl: './transactions.component.html',
  styleUrls: ['./transactions.component.scss'],
})
export class TransactionsComponent implements OnInit {
  state$ = this.store.select(selectState);

  constructor(private store: Store) {}

  ngOnInit(): void {
    this.store.dispatch(getData());
  }
}
