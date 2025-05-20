import { Ticker } from '@aws/util';
import { createAction, props } from '@ngrx/store';

export const getTicker = createAction('[Yahoo] Get Ticker');
export const getTickersSuccess = createAction(
  '[Yahoo] Get Ticker Success',
  props<{ tickers: {[ticker:string]: Ticker} }>()
);
export const getTickerFailure = createAction(
  '[Yahoo] Get Ticker Failure',
  props<{ error: string }>()
);
