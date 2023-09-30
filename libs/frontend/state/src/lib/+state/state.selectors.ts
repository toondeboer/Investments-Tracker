import { createFeatureSelector, createSelector } from '@ngrx/store';
import { FeatureState, featureKey } from './state.reducer';

export const selectFeature = createFeatureSelector<FeatureState>(featureKey);

export const selectValue = createSelector(
  selectFeature,
  (state: FeatureState) => state.value
);
