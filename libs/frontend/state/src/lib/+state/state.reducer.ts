import { createFeature, createReducer, on } from '@ngrx/store';
import { addDataSuccess, getDataSuccess } from './state.actions';

export const featureKey = 'feature';

export interface FeatureState {
  value: number;
  data: string;
}

export const initialState: FeatureState = {
  value: 0,
  data: '',
};

export const reducer = createReducer(
  initialState,
  on(addDataSuccess, (state, action) => ({ ...state, data: action.data })),
  on(getDataSuccess, (state, action) => ({ ...state, data: action.data }))
);

export const feature = createFeature({ name: featureKey, reducer });
