import { createFeatureSelector, createSelector } from '@ngrx/store';
import { FeatureState, featureKey } from './yahoo.reducer';

export const selectFeature = createFeatureSelector<FeatureState>(featureKey);

export const selectYahoo = createSelector(
  selectFeature,
  (state: FeatureState) => state
);
