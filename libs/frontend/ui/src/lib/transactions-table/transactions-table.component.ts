import { Component, Input } from '@angular/core';
import {
  deleteTransaction,
  renameHolding,
  saveTransaction,
  updateHolding,
  updateTransaction,
} from '@aws/state';
import { Transaction, TransactionKey, Transactions, Stock } from '@aws/util';
import { Store } from '@ngrx/store';
import { CommonModule, DecimalPipe } from '@angular/common';
import { LucideAngularModule } from 'lucide-angular';
import { DialogService } from '../dialog/dialog.service';
import {
  TransactionDialogComponent,
  TransactionDialogData,
  TransactionDialogResult,
} from '../transaction-dialog/transaction-dialog.component';
import {
  HoldingEditDialogComponent,
  HoldingEditDialogData,
  HoldingEditResult,
} from '../holding-edit-dialog/holding-edit-dialog.component';

@Component({
  selector: 'aws-transactions-table',
  templateUrl: './transactions-table.component.html',
  styleUrls: ['./transactions-table.component.scss'],
  imports: [DecimalPipe, CommonModule, LucideAngularModule],
})
export class TransactionsTableComponent {
  @Input() stocks: { [ticker: string]: Stock } = {};
  @Input() transactions: Transactions | undefined;
  @Input() portfolioId = 'default';
  @Input() baseCurrency = 'EUR';

  constructor(
    private readonly store: Store,
    private readonly dialog: DialogService
  ) {}

  /** Open the dialog to add a brand-new holding (ticker + currency editable). */
  onAddHolding() {
    const data: TransactionDialogData = { mode: 'add' };
    this.openTransactionDialog(data);
  }

  /** Open the dialog to add a transaction to an existing, single-currency holding. */
  onAddTransaction(stock: Stock) {
    const data: TransactionDialogData = {
      mode: 'add',
      ticker: stock.ticker,
      lockedCurrency: stock.currency.value,
    };
    this.openTransactionDialog(data);
  }

  onEditTransaction(transaction: Transaction) {
    const data: TransactionDialogData = { mode: 'edit', transaction };
    this.dialog
      .open(TransactionDialogComponent, { data, width: '480px' })
      .afterClosed()
      .subscribe((result) => {
        const r = result as TransactionDialogResult | undefined;
        if (!r || !r.originalKey) return;
        this.store.dispatch(
          updateTransaction({
            portfolioId: this.portfolioId,
            originalKey: r.originalKey,
            transaction: r.transaction,
          })
        );
      });
  }

  onDeleteTransaction(transaction: Transaction) {
    const key: TransactionKey = {
      type: transaction.type,
      ticker: transaction.ticker,
      date: transaction.date.toISOString().split('T')[0],
      time: transaction.time,
      value: transaction.value,
    };
    this.store.dispatch(deleteTransaction({ portfolioId: this.portfolioId, transactionKey: key }));
  }

  onEditHolding(stock: Stock) {
    const data: HoldingEditDialogData = {
      ticker: stock.ticker,
      currency: stock.currency.value,
    };
    this.dialog
      .open(HoldingEditDialogComponent, { data, width: '380px' })
      .afterClosed()
      .subscribe((result) => {
        const r = result as HoldingEditResult | undefined;
        if (!r) return;
        const tickerChanged = r.newTicker !== stock.ticker;
        const currencyChanged = r.currency !== stock.currency.value;
        if (tickerChanged && currencyChanged) {
          this.store.dispatch(
            updateHolding({
              portfolioId: this.portfolioId,
              oldTicker: stock.ticker,
              newTicker: r.newTicker,
              currency: r.currency,
            })
          );
        } else if (tickerChanged) {
          this.store.dispatch(
            renameHolding({
              portfolioId: this.portfolioId,
              oldTicker: stock.ticker,
              newTicker: r.newTicker,
            })
          );
        } else if (currencyChanged) {
          this.store.dispatch(
            updateHolding({
              portfolioId: this.portfolioId,
              oldTicker: stock.ticker,
              newTicker: stock.ticker,
              currency: r.currency,
            })
          );
        }
      });
  }

  private openTransactionDialog(data: TransactionDialogData) {
    this.dialog
      .open(TransactionDialogComponent, { data, width: '480px' })
      .afterClosed()
      .subscribe((result) => {
        const r = result as TransactionDialogResult | undefined;
        if (!r) return;
        this.store.dispatch(
          saveTransaction({ portfolioId: this.portfolioId, transaction: r.transaction })
        );
      });
  }

  protected readonly Object = Object;
}
