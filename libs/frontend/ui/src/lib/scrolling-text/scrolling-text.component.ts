import { Component, Input, OnInit, inject } from '@angular/core';
import { selectBaseCurrency, selectState } from '@aws/state';
import { Store } from '@ngrx/store';
import { AsyncPipe, CommonModule, DecimalPipe, NgClass } from '@angular/common';
import { Observable, map, of } from 'rxjs';
import { Summary, getCurrencySymbol } from '@aws/util';

@Component({
  selector: 'aws-scrolling-text',
  templateUrl: './scrolling-text.component.html',
  styleUrls: ['./scrolling-text.component.scss'],
  imports: [NgClass, DecimalPipe, AsyncPipe, CommonModule],
})
export class ScrollingTextComponent implements OnInit {
  private store = inject(Store);

  /** Optional static summary — when provided, bypasses the store (e.g. demo). */
  @Input() summary?: Summary | null;
  /** Optional currency symbol — when provided, bypasses the store. */
  @Input() currencySymbol?: string;

  summary$!: Observable<Summary | null | undefined>;
  symbol$!: Observable<string>;

  ngOnInit(): void {
    this.summary$ =
      this.summary !== undefined
        ? of(this.summary)
        : this.store.select(selectState).pipe(map((state) => state?.summary));

    this.symbol$ =
      this.currencySymbol !== undefined
        ? of(this.currencySymbol)
        : this.store
            .select(selectBaseCurrency)
            .pipe(map((c) => getCurrencySymbol(c)));
  }
}
