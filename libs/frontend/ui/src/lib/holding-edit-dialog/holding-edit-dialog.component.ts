import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DialogRef, DIALOG_DATA, DIALOG_REF } from '../dialog/dialog-ref';

export type HoldingEditDialogData = {
  ticker: string;
  currency: string;
};

export type HoldingEditResult = {
  newTicker: string;
  currency: string;
};

@Component({
  selector: 'aws-holding-edit-dialog',
  templateUrl: './holding-edit-dialog.component.html',
  styleUrls: ['./holding-edit-dialog.component.scss'],
  imports: [CommonModule, FormsModule],
})
export class HoldingEditDialogComponent {
  ticker: string;
  currency: string;

  constructor(
    @Inject(DIALOG_REF)
    public dialogRef: DialogRef<HoldingEditDialogComponent, HoldingEditResult | undefined>,
    @Inject(DIALOG_DATA) public data: HoldingEditDialogData
  ) {
    this.ticker = data.ticker;
    this.currency = data.currency;
  }

  get canConfirm(): boolean {
    return this.ticker.trim().length > 0;
  }

  confirm() {
    if (!this.canConfirm) return;
    this.dialogRef.close({ newTicker: this.ticker.trim(), currency: this.currency });
  }

  cancel() {
    this.dialogRef.close(undefined);
  }
}
