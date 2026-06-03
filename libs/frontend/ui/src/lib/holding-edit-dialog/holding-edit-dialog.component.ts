import { Component, inject } from '@angular/core';

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
  imports: [FormsModule],
})
export class HoldingEditDialogComponent {
  dialogRef = inject<DialogRef<HoldingEditDialogComponent, HoldingEditResult | undefined>>(DIALOG_REF);
  data = inject<HoldingEditDialogData>(DIALOG_DATA);

  ticker: string;
  currency: string;

  constructor() {
    const data = this.data;

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
