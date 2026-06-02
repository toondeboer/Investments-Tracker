import { ChangeDetectorRef, Component, Input } from '@angular/core';
import {
  deleteAllTransactions,
  deleteTransaction,
  handleFileInput,
  saveTransaction,
} from '@aws/state';
import {
  Transaction,
  TransactionKey,
  TransactionType,
  Transactions,
  Stock,
} from '@aws/util';
import { Store } from '@ngrx/store';
import { Papa } from 'ngx-papaparse';
import { FormsModule } from '@angular/forms';
import { CommonModule, DecimalPipe } from '@angular/common';

@Component({
  selector: 'aws-transactions-table',
  templateUrl: './transactions-table.component.html',
  styleUrls: ['./transactions-table.component.scss'],
  imports: [FormsModule, DecimalPipe, CommonModule],
})
export class TransactionsTableComponent {
  @Input() stocks: { [ticker: string]: Stock } = {};
  @Input() transactions: Transactions | undefined;
  @Input() portfolioId = 'default';
  @Input() baseCurrency = 'EUR';

  constructor(
    private readonly store: Store,
    private papa: Papa,
    private cdr: ChangeDetectorRef
  ) {}

  ticker = '';
  type: TransactionType = 'stock';
  date = new Date();
  amount = 0;
  value = 0;
  currency: 'EUR' | 'USD' = 'EUR';

  csvData: any[] = [];

  saveTransaction() {
    const newTransaction: Transaction = {
      ticker: this.ticker,
      type: this.type,
      date: new Date(this.date),
      amount: this.amount,
      value: this.value,
      currency: this.currency,
    };
    this.store.dispatch(
      saveTransaction({ portfolioId: this.portfolioId, transaction: newTransaction })
    );
  }

  deleteTransactionEntry(transaction: Transaction) {
    const key: TransactionKey = {
      type: transaction.type,
      ticker: transaction.ticker,
      date: transaction.date.toISOString().split('T')[0],
      time: transaction.time,
      value: transaction.value,
    };
    this.store.dispatch(deleteTransaction({ portfolioId: this.portfolioId, transactionKey: key }));
  }

  deleteAll() {
    this.store.dispatch(deleteAllTransactions({ portfolioId: this.portfolioId }));
  }

  handleFileInput(event: Event) {
    const inputElement = event.target as HTMLInputElement;
    if (inputElement.files && inputElement.files.length > 0) {
      const file = inputElement.files[0];
      this.papa.parse(file, {
        complete: (result) => {
          this.csvData = result.data;
          this.cdr.detectChanges();
          this.store.dispatch(handleFileInput({ data: result.data }));
        },
        header: true,
      });
    }
  }

  protected readonly Object = Object;
}
