import { Component } from '@angular/core';
import { selectState } from '@aws/state';
import { Store } from '@ngrx/store';
import { YahooComponent } from '../yahoo/yahoo.component';
import { SummaryComponent } from '../summary/summary.component';
import { AsyncPipe, CommonModule, NgIf } from '@angular/common';
import { ChartData } from '@aws/util';

@Component({
  selector: 'aws-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss'],
  imports: [YahooComponent, SummaryComponent, AsyncPipe, CommonModule],
})
export class DashboardComponent {
  state$ = this.store.select(selectState);
  activeChartData: ChartData | undefined;

  constructor(private store: Store) {}
}
