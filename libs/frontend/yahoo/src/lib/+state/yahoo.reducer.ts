import { createFeature, createReducer, on } from '@ngrx/store';
import { getTickersSuccess } from './yahoo.actions';
import { Ticker } from '@aws/util';

export const featureKey = 'yahoo';

export interface FeatureState {
  tickers: { [ticker: string]: Ticker };
}

export const initialState: FeatureState = {
  tickers: {},
};

export const reducer = createReducer(
  initialState,
  on(getTickersSuccess, (state, action) => ({
    ...state,
    tickers: action.tickers,
  }))
);

export const feature = createFeature({ name: featureKey, reducer });
