import { Component } from '@angular/core';
import { selectState } from '@aws/state';
import { Store } from '@ngrx/store';
import { AsyncPipe, CommonModule, DecimalPipe, NgClass, NgIf } from '@angular/common';

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

  constructor(private store: Store) {}
}
