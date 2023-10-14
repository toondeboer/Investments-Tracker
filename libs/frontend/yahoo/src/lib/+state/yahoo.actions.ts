import { Ticker } from '@aws/util';
import { createAction, props } from '@ngrx/store';

export const getTicker = createAction(
  '[Yahoo] Get Ticker',
  props<{ name: string }>()
);
export const getTickerSuccess = createAction(
  '[Yahoo] Get Ticker Success',
  props<{ ticker: Ticker }>()
);
export const getTickerFailure = createAction(
  '[Yahoo] Get Ticker Failure',
  props<{ error: string }>()
);
