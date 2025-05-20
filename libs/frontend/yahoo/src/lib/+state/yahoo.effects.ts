import { HttpErrorResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Store } from '@ngrx/store';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { switchMap, catchError, of, withLatestFrom, mergeMap } from 'rxjs';
import { YahooService } from '../yahoo.service';
import {
  getTicker,
  getTickerFailure,
  getTickersSuccess,
} from './yahoo.actions';
import { yahooObjectsToTickers } from '@aws/util';
import {
  deleteTransactionSuccess,
  getDataSuccess,
  saveTransactionSuccess,
  selectState,
  setChartData,
} from '@aws/state';
import { selectYahoo } from './yahoo.selectors';

@Injectable()
export class YahooEffects {
  constructor(
    private store: Store,
    private readonly actions$: Actions,
    private readonly service: YahooService
  ) {}

  public readonly getTicker$ = createEffect(() =>
    this.actions$.pipe(
      ofType(getDataSuccess),
      withLatestFrom(this.store.select(selectState)),
      switchMap(([_, { stocks, summary }]) => {
        return this.service
          .getTickers(Object.keys(stocks), summary.startDate)
          .pipe(
            mergeMap((yahooObjects) => {
              const tickers = yahooObjectsToTickers(yahooObjects);
              console.log('Tickers', tickers);
              return [
                getTickersSuccess({ tickers }),
                setChartData({ tickers }),
              ];
            }),
            catchError((error: HttpErrorResponse) =>
              of(getTickerFailure({ error: error.message }))
            )
          );
      })
    )
  );

  public readonly setChartData$ = createEffect(() =>
    this.actions$.pipe(
      ofType(getDataSuccess, saveTransactionSuccess, deleteTransactionSuccess),
      withLatestFrom(this.store.select(selectYahoo)),
      switchMap(([_, { tickers }]) => {
        if (Object.keys(tickers).length > 0) {
          return [setChartData({ tickers })];
        } else {
          return [];
        }
      })
    )
  );
}
