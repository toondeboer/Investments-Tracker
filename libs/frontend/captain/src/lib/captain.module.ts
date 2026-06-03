import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { StoreModule } from '@ngrx/store';
import { EffectsModule } from '@ngrx/effects';
import { CaptainEffects } from './+state/captain.effects';
import { feature } from './+state/captain.reducer';

@NgModule({
  imports: [
    CommonModule,
    StoreModule.forFeature(feature),
    EffectsModule.forFeature([CaptainEffects]),
  ],
})
export class CaptainModule {}
