import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DialogRef, DIALOG_DATA, DIALOG_REF } from '../dialog/dialog-ref';
import { Transaction, TransactionKey, TransactionType } from '@aws/util';
import { DatePickerComponent } from '../date-picker/date-picker.component';

export type TransactionDialogData = {
  mode: 'add' | 'edit';
  /** Locked ticker when adding to / editing an existing holding. */
  ticker?: string;
  /** Locked currency when adding to / editing an existing holding. */
  lockedCurrency?: string;
  /** The transaction being edited (mode 'edit'). */
  transaction?: Transaction;
};

export type TransactionDialogResult = {
  transaction: Transaction;
  /** Present only when editing — identifies the row to replace. */
  originalKey?: TransactionKey;
};

@Component({
  selector: 'aws-transaction-dialog',
  templateUrl: './transaction-dialog.component.html',
  styleUrls: ['./transaction-dialog.component.scss'],
  imports: [CommonModule, FormsModule, DatePickerComponent],
})
export class TransactionDialogComponent {
  type: TransactionType = 'stock';
  ticker = '';
  /** Date as the native input's YYYY-MM-DD string. */
  date = new Date().toISOString().split('T')[0];
  amount = 0;
  value = 0;
  pricePerShare = 0;
  currency = 'EUR';

  /** Ticker is fixed for an existing holding or when editing. */
  readonly tickerLocked: boolean;
  /** Currency is fixed for an existing holding or when editing. */
  readonly currencyLocked: boolean;

  private readonly original?: Transaction;

  constructor(
    @Inject(DIALOG_REF)
    public dialogRef: DialogRef<TransactionDialogComponent, TransactionDialogResult | undefined>,
    @Inject(DIALOG_DATA) public data: TransactionDialogData
  ) {
    this.tickerLocked = !!data.ticker || data.mode === 'edit';
    this.currencyLocked = !!data.lockedCurrency || data.mode === 'edit';

    if (data.mode === 'edit' && data.transaction) {
      const tx = data.transaction;
      this.original = tx;
      this.type = tx.type;
      this.ticker = tx.ticker;
      this.date = tx.date.toISOString().split('T')[0];
      this.amount = tx.amount;
      this.value = tx.value;
      this.currency = tx.currency;
      this.recomputePerShareFromTotal();
    } else {
      if (data.ticker) this.ticker = data.ticker;
      if (data.lockedCurrency) this.currency = data.lockedCurrency;
    }
  }

  get title(): string {
    if (this.data.mode === 'edit') return 'Edit transaction';
    return this.data.ticker ? `Add transaction — ${this.data.ticker}` : 'Add holding';
  }

  // --- value ⇄ price-per-share sync -----------------------------------------
  // Total value and per-share price are kept consistent through the share
  // amount, so the user can fill in whichever they know.
  recomputePerShareFromTotal() {
    this.pricePerShare = this.amount !== 0 ? this.value / this.amount : 0;
  }

  recomputeTotalFromPerShare() {
    this.value = this.pricePerShare * this.amount;
  }

  onAmountChange() {
    // Keep the figure the user last set fixed: derive total from per-share when
    // a per-share price is present, otherwise re-derive per-share from total.
    if (this.pricePerShare !== 0) {
      this.recomputeTotalFromPerShare();
    } else {
      this.recomputePerShareFromTotal();
    }
  }

  get canConfirm(): boolean {
    return this.ticker.trim().length > 0 && !!this.date;
  }

  confirm() {
    if (!this.canConfirm) return;
    const transaction: Transaction = {
      ticker: this.ticker.trim(),
      type: this.type,
      date: new Date(this.date),
      time: this.original?.time,
      amount: this.amount,
      value: this.value,
      currency: this.currency,
    };
    const originalKey: TransactionKey | undefined = this.original
      ? {
          type: this.original.type,
          ticker: this.original.ticker,
          date: this.original.date.toISOString().split('T')[0],
          time: this.original.time,
          value: this.original.value,
        }
      : undefined;
    this.dialogRef.close({ transaction, originalKey });
  }

  cancel() {
    this.dialogRef.close(undefined);
  }
}
