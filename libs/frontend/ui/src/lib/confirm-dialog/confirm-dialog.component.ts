import { Component, inject } from '@angular/core';

import { DialogRef, DIALOG_DATA, DIALOG_REF } from '../dialog/dialog-ref';

export type ConfirmDialogData = {
  title: string;
  message: string;
  confirmLabel?: string;
};

@Component({
  selector: 'aws-confirm-dialog',
  templateUrl: './confirm-dialog.component.html',
  styleUrls: ['./confirm-dialog.component.scss'],
  imports: [],
})
export class ConfirmDialogComponent {
  dialogRef = inject<DialogRef<ConfirmDialogComponent, boolean>>(DIALOG_REF);
  data = inject<ConfirmDialogData>(DIALOG_DATA);
}
