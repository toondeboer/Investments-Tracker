import { Component } from '@angular/core';
import { selectState } from '@aws/state';
import { Store } from '@ngrx/store';
import { YahooComponent } from '../yahoo/yahoo.component';
import { SummaryComponent } from '../summary/summary.component';
import { AsyncPipe, CommonModule, NgIf } from '@angular/common';
import { ChartData } from '@aws/util';
import { ActiveTickersComponent } from '../active-tickers/active-tickers.component';

@Component({
  selector: 'aws-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss'],
  imports: [SummaryComponent, AsyncPipe, CommonModule, ActiveTickersComponent],
})
export class DashboardComponent {
  state$ = this.store.select(selectState);

  constructor(private store: Store) {}
}
