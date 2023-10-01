import { createFeature, createReducer, on } from '@ngrx/store';
import { addData, getDataSuccess } from './state.actions';

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
  on(addData, (state) => ({ ...state, value: state.value + 1 })),
  on(getDataSuccess, (state, action) => ({ ...state, data: action.data }))
);

export const feature = createFeature({ name: featureKey, reducer });
