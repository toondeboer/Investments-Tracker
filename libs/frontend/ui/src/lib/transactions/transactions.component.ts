import { Component, OnInit, inject } from '@angular/core';
import { getData, selectState } from '@aws/state';
import { Store } from '@ngrx/store';
import { TransactionsTableComponent } from '../transactions-table/transactions-table.component';
import { AsyncPipe, CommonModule } from '@angular/common';

@Component({
  selector: 'aws-transactions',
  templateUrl: './transactions.component.html',
  styleUrls: ['./transactions.component.scss'],
  imports: [
    TransactionsTableComponent,
    AsyncPipe,
    CommonModule
  ]
})
export class TransactionsComponent implements OnInit {
  private store = inject(Store);

  state$ = this.store.select(selectState);

  ngOnInit(): void {
    this.store.dispatch(getData());
  }
}
