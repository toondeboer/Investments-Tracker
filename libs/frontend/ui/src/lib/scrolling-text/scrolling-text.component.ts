import { Component } from '@angular/core';
import { selectBaseCurrency, selectState } from '@aws/state';
import { Store } from '@ngrx/store';
import { AsyncPipe, CommonModule, DecimalPipe, NgClass, NgIf } from '@angular/common';
import { map } from 'rxjs';

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
  state$ = this.store.select(selectState);
  currencySymbol$ = this.store.select(selectBaseCurrency).pipe(
    map(c => c === 'USD' ? '$' : '€')
  );

  constructor(private store: Store) {}
}
