import { Component } from '@angular/core';
import { selectState } from '@aws/state';
import { Store } from '@ngrx/store';

@Component({
  selector: 'aws-scrolling-text',
  templateUrl: './scrolling-text.component.html',
  styleUrls: ['./scrolling-text.component.scss'],
})
export class ScrollingTextComponent {
  state$ = this.store.select(selectState);

  constructor(private store: Store) {}
}
