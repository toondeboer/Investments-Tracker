import { Component, inject } from '@angular/core';
import { selectBaseCurrency, selectState } from '@aws/state';
import { Store } from '@ngrx/store';
import { AsyncPipe, CommonModule, DecimalPipe, NgClass } from '@angular/common';
import { map } from 'rxjs';
import { getCurrencySymbol } from '@aws/util';

@Component({
  selector: 'aws-scrolling-text',
  templateUrl: './scrolling-text.component.html',
  styleUrls: ['./scrolling-text.component.scss'],
  imports: [
    NgClass,
    DecimalPipe,
    AsyncPipe,
    CommonModule
  ]
})
export class ScrollingTextComponent {
  private store = inject(Store);

  state$ = this.store.select(selectState);
  currencySymbol$ = this.store.select(selectBaseCurrency).pipe(
    map((c) => getCurrencySymbol(c))
  );
}
