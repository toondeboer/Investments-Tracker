import { createFeature, createReducer, on } from '@ngrx/store';
import { getTickerSuccess } from './yahoo.actions';
import { Ticker } from '@aws/util';

export const featureKey = 'yahoo';

export interface FeatureState {
  ticker: Ticker | null;
}

export const initialState: FeatureState = {
  ticker: null,
};

export const reducer = createReducer(
  initialState,
  on(getTickerSuccess, (state, action) => ({ ...state, ticker: action.ticker }))
);

export const feature = createFeature({ name: featureKey, reducer });
