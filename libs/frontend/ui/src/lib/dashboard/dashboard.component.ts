import { Component } from '@angular/core';
import { selectState } from '@aws/state';
import { Store } from '@ngrx/store';

@Component({
  selector: 'aws-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss'],
})
export class DashboardComponent {
  state$ = this.store.select(selectState);

  constructor(private store: Store) {}
}
