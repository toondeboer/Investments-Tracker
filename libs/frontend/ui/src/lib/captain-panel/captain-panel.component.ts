import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import { Store } from '@ngrx/store';
import {
  BillingService,
  CAPTAIN_PROMPTS,
  clearChat,
  loadStatus,
  selectChatError,
  selectChatLoading,
  selectChatQuotaExceeded,
  selectIsPaidMember,
  selectMessages,
  selectStatus,
  sendMessage,
} from '@aws/captain';
import { DialogRef, DIALOG_DATA, DIALOG_REF } from '../dialog/dialog-ref';

export type CaptainPanelData = {
  /** Demo mode serves canned replies and never calls the Lambda. */
  demo?: boolean;
};

/**
 * "Ask the Captain" chat panel. Wired to the global `captain` NgRx slice; when
 * opened in demo mode the same actions resolve to canned, offline replies (see
 * the captain effects), so this one component serves both the app and /demo.
 */
@Component({
  selector: 'aws-captain-panel',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule],
  templateUrl: './captain-panel.component.html',
  styleUrls: ['./captain-panel.component.scss'],
})
export class CaptainPanelComponent implements OnInit {
  private store = inject(Store);
  private billing = inject(BillingService);
  dialogRef = inject<DialogRef<CaptainPanelComponent>>(DIALOG_REF);
  data = inject<CaptainPanelData>(DIALOG_DATA);

  readonly prompts = CAPTAIN_PROMPTS;
  messages$ = this.store.select(selectMessages);
  loading$ = this.store.select(selectChatLoading);
  error$ = this.store.select(selectChatError);
  quotaExceeded$ = this.store.select(selectChatQuotaExceeded);
  status$ = this.store.select(selectStatus);
  isPaidMember$ = this.store.select(selectIsPaidMember);

  draft = '';

  ngOnInit(): void {
    // Refresh plan + usage when the panel opens (skipped in demo — no backend).
    if (!this.data?.demo) {
      this.store.dispatch(loadStatus());
    }
  }

  send(content: string): void {
    const text = content.trim();
    if (!text) {
      return;
    }
    this.store.dispatch(sendMessage({ content: text, demo: this.data?.demo }));
    this.draft = '';
  }

  clear(): void {
    this.store.dispatch(clearChat());
  }

  /** Start the Stripe Checkout upgrade flow (no-op in demo mode). */
  upgrade(): void {
    if (this.data?.demo) {
      return;
    }
    this.billing.startUpgrade();
  }

  close(): void {
    this.dialogRef.close();
  }
}
