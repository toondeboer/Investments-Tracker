import { Component, Input } from '@angular/core';
import { deleteTransaction, saveTransaction } from '@aws/state';
import { Transaction } from '@aws/util';
import { Store } from '@ngrx/store';

@Component({
  selector: 'aws-transactions-table',
  templateUrl: './transactions-table.component.html',
  styleUrls: ['./transactions-table.component.scss'],
})
export class TransactionsTableComponent {
  @Input() transactions: Transaction[] = [];

  constructor(private readonly store: Store) {}

  date = new Date();
  amount = 0;
  value = 0;

  saveTransaction() {
    this.store.dispatch(
      saveTransaction({
        transaction: {
          date: this.date,
          amount: this.amount,
          value: this.value,
        },
      })
    );
  }

  deleteTransaction(transactions: Transaction[], transaction: Transaction) {
    const newTransactions = transactions.filter((t) => t != transaction);
    this.store.dispatch(deleteTransaction({ newTransactions }));
  }
}
