import {
  Component,
  Input,
  OnChanges,
  OnInit,
  SimpleChanges,
} from '@angular/core';
import { ChartData, Transaction } from '@aws/util';
import { getTicker, selectYahoo } from '@aws/yahoo';
import { Store } from '@ngrx/store';

@Component({
  selector: 'aws-yahoo',
  templateUrl: './yahoo.component.html',
  styleUrls: ['./yahoo.component.scss'],
})
export class YahooComponent implements OnInit, OnChanges {
  @Input() transactions: Transaction[] = [];
  @Input() dates: Date[] = [];
  @Input() chartData: ChartData | undefined;

  yahoo$ = this.store.select(selectYahoo);

  constructor(private store: Store) {}
  ngOnChanges(changes: SimpleChanges): void {
    console.log(changes);
  }

  ngOnInit(): void {
    this.store.dispatch(
      getTicker({
        name: 'VUSA.AS',
      })
    );
  }
}
