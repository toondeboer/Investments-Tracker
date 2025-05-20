import { ChangeDetectorRef, Component, Input } from '@angular/core';
import {
  deleteAllTransactions,
  deleteTransaction,
  handleFileInput,
  saveTransaction,
} from '@aws/state';
import {
  Transaction,
  TransactionType,
  Transactions,
  Stock,
  TransactionsDbo,
} from '@aws/util';
import { Store } from '@ngrx/store';
import { Papa } from 'ngx-papaparse';
import { FormsModule } from '@angular/forms';
import { CommonModule, DecimalPipe, NgForOf, NgIf } from '@angular/common';

@Component({
  selector: 'aws-transactions-table',
  templateUrl: './transactions-table.component.html',
  styleUrls: ['./transactions-table.component.scss'],
  imports: [FormsModule, DecimalPipe, CommonModule],
})
export class TransactionsTableComponent {
  @Input() stocks: { [ticker: string]: Stock } = {};
  @Input() transactions: Transactions | undefined;

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

  csvData: any[] = [];

  saveTransaction() {
    if (!this.transactions) {
      console.error('Transactions not initialized.');
      return;
    }
    const newTransaction = {
      ticker: this.ticker,
      type: this.type,
      date: new Date(this.date),
      amount: this.amount,
      value: this.value,
    };
    console.log('New transaction: ', newTransaction);
    const newTransactions = {
      stock: [...this.transactions.stock],
      dividend: [...this.transactions.dividend],
      commission: [...this.transactions.commission],
    };
    switch (newTransaction.type) {
      case 'stock':
        if (newTransactions.stock.length > 0) {
          newTransactions.stock.push(newTransaction);
        } else {
          newTransactions.stock = [newTransaction];
        }
        break;
      case 'dividend':
        if (newTransactions.dividend.length > 0) {
          newTransactions.dividend.push(newTransaction);
        } else {
          newTransactions.dividend = [newTransaction];
        }
        break;
      case 'commission':
        if (newTransactions.commission.length > 0) {
          newTransactions.commission.push(newTransaction);
        } else {
          newTransactions.commission = [newTransaction];
        }
        break;
      default:
        console.log(`Invalid type: ${newTransaction.type}`);
        return;
    }
    this.store.dispatch(
      saveTransaction({
        transactions: newTransactions,
      })
    );
  }

  deleteTransaction(transactions: Transactions, transaction: Transaction) {
    // const newTransactions = transactions.filter((t) => t != transaction);
    // this.store.dispatch(deleteTransaction({ newTransactions }));
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

  protected readonly Object = Object;
}
