import { ChangeDetectorRef, Component, Input } from '@angular/core';
import {
  deleteAllTransactions,
  deleteTransaction,
  handleFileInput,
  saveTransaction,
} from '@aws/state';
import { Transaction } from '@aws/util';
import { Store } from '@ngrx/store';
import { Papa } from 'ngx-papaparse';

@Component({
  selector: 'aws-transactions-table',
  templateUrl: './transactions-table.component.html',
  styleUrls: ['./transactions-table.component.scss'],
})
export class TransactionsTableComponent {
  @Input() transactions: Transaction[] = [];

  constructor(
    private readonly store: Store,
    private papa: Papa,
    private cdr: ChangeDetectorRef
  ) {}

  date = new Date();
  amount = 0;
  value = 0;

  csvData: any[] = [];

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

  deleteAll() {
    this.store.dispatch(deleteAllTransactions());
  }

  handleFileInput(event: Event) {
    const inputElement = event.target as HTMLInputElement;
    if (inputElement.files && inputElement.files.length > 0) {
      const file = inputElement.files[0];
      this.papa.parse(file, {
        complete: (result) => {
          this.csvData = result.data;
          this.cdr.detectChanges(); // Trigger change detection to update the view
          this.store.dispatch(handleFileInput({ data: result.data }));
        },
        header: true,
      });
    }
  }
}
