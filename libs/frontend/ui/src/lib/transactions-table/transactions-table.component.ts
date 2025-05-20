import { ChangeDetectorRef, Component, Input } from '@angular/core';
import {
  deleteAllTransactions,
  deleteTransaction,
  handleFileInput,
  saveTransaction,
} from '@aws/state';
import { Transaction, TransactionType, Transactions } from '@aws/util';
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
  @Input() transactions: Transactions | undefined;

  constructor(
    private readonly store: Store,
    private papa: Papa,
    private cdr: ChangeDetectorRef
  ) {}

  type: TransactionType = 'stock';
  date = new Date();
  amount = 0;
  value = 0;

  csvData: any[] = [];

  saveTransaction(transactions: Transactions) {
    // const newTransaction = {
    //   type: this.type,
    //   date: this.date,
    //   amount: this.amount,
    //   value: this.value,
    // };
    // const newTransactions = { ...transactions };
    // switch (newTransaction.type) {
    //   case 'stock':
    //     transactions.stock.length > 0
    //       ? newTransactions.stock.push(newTransaction)
    //       : (newTransactions.stock = [newTransaction]);
    //     break;
    //   case 'dividend':
    //     transactions.dividend.length > 0
    //       ? newTransactions.dividend.push(newTransaction)
    //       : (newTransactions.dividend = [newTransaction]);
    //     break;
    //   case 'commission':
    //     transactions.commission.length > 0
    //       ? newTransactions.commission.push(newTransaction)
    //       : (newTransactions.commission = [newTransaction]);
    //     break;
    //   default:
    //     console.log(`Invalid type: ${newTransaction.type}`);
    //     return;
    // }
    // this.store.dispatch(
    //   saveTransaction({
    //     transactions: newTransactions,
    //   })
    // );
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
}
