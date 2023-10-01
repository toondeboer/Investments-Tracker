import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { StoreModule } from '@ngrx/store';
import { EffectsModule } from '@ngrx/effects';
import { feature } from './+state/state.reducer';
import { StateEffects } from './+state/state.effects';

@NgModule({
  imports: [
    CommonModule,
    StoreModule.forFeature(feature),
    EffectsModule.forFeature([StateEffects]),
  ],
})
export class StateModule {}
