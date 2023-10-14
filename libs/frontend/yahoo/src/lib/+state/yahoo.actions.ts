import { Ticker, TickerRequest } from '@aws/util';
import { createAction, props } from '@ngrx/store';

export const getTicker = createAction(
  '[Yahoo] Get Ticker',
  props<{ tickerRequest: TickerRequest }>()
);
export const getTickerSuccess = createAction(
  '[Yahoo] Get Ticker Success',
  props<{ ticker: Ticker }>()
);
export const getTickerFailure = createAction(
  '[Yahoo] Get Ticker Failure',
  props<{ error: string }>()
);
