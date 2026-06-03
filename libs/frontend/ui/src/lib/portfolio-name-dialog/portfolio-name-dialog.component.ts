import { Component, inject } from '@angular/core';

import { FormsModule } from '@angular/forms';
import { DialogRef, DIALOG_DATA, DIALOG_REF } from '../dialog/dialog-ref';

export type PortfolioNameDialogData = {
  title: string;
  initialName?: string;
};

@Component({
  selector: 'aws-portfolio-name-dialog',
  templateUrl: './portfolio-name-dialog.component.html',
  styleUrls: ['./portfolio-name-dialog.component.scss'],
  imports: [FormsModule],
})
export class PortfolioNameDialogComponent {
  dialogRef = inject<DialogRef<PortfolioNameDialogComponent, string>>(DIALOG_REF);
  data = inject<PortfolioNameDialogData>(DIALOG_DATA);

  name: string;

  constructor() {
    const data = this.data;

    this.name = data.initialName ?? '';
  }

  confirm() {
    if (this.name.trim()) {
      this.dialogRef.close(this.name.trim());
    }
  }

  cancel() {
    this.dialogRef.close(undefined);
  }
}
