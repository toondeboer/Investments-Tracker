import { Component, Input } from '@angular/core';
import { ChartData } from '@aws/util';
import { selectYahoo } from '@aws/yahoo';
import { Store } from '@ngrx/store';

@Component({
  selector: 'aws-yahoo',
  templateUrl: './yahoo.component.html',
  styleUrls: ['./yahoo.component.scss'],
})
export class YahooComponent {
  @Input() dates: Date[] = [];
  @Input() chartData: ChartData | undefined;

  yahoo$ = this.store.select(selectYahoo);

  constructor(private store: Store) {}
}
