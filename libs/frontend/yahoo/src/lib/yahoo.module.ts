import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { StoreModule } from '@ngrx/store';
import { EffectsModule } from '@ngrx/effects';
import { YahooEffects } from './+state/yahoo.effects';
import { feature } from './+state/yahoo.reducer';

@NgModule({
  imports: [
    CommonModule,
    StoreModule.forFeature(feature),
    EffectsModule.forFeature([YahooEffects]),
  ],
})
export class YahooModule {}
