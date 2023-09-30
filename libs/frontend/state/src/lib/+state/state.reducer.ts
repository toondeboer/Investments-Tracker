import { createFeature, createReducer, on } from '@ngrx/store';
import { addData } from './state.actions';

export const featureKey = 'feature';

export interface FeatureState {
  value: number;
}

export const initialState: FeatureState = {
  value: 0,
};

export const reducer = createReducer(
  initialState,
  on(addData, (state) => ({ value: state.value + 1 }))
);

export const feature = createFeature({ name: featureKey, reducer });
