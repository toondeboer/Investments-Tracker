import { Component, Input, OnInit } from '@angular/core';
import { Transaction } from '@aws/util';
import { getTicker, selectYahoo } from '@aws/yahoo';
import { Store } from '@ngrx/store';

@Component({
  selector: 'aws-yahoo',
  templateUrl: './yahoo.component.html',
  styleUrls: ['./yahoo.component.scss'],
})
export class YahooComponent implements OnInit {
  @Input() transactions: Transaction[] = [];

  yahoo$ = this.store.select(selectYahoo);

  constructor(private store: Store) {}

  ngOnInit(): void {
    this.store.dispatch(
      getTicker({
        tickerRequest: {
          name: 'AAPL',
          startDate: this.transactions[0].date,
          endDate: this.transactions[this.transactions.length - 1].date,
        },
      })
    );
  }
}
