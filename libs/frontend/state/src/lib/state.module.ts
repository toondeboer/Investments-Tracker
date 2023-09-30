import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { feature } from './+state/state.reducer';
import { StoreModule } from '@ngrx/store';

@NgModule({
  imports: [CommonModule, StoreModule.forFeature(feature)],
})
export class StateModule {}
