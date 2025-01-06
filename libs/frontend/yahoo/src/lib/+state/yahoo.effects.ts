import { HttpErrorResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Store } from '@ngrx/store';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { switchMap, catchError, of, withLatestFrom, mergeMap } from 'rxjs';
import { YahooService } from '../yahoo.service';
import { getTicker, getTickerFailure, getTickerSuccess } from './yahoo.actions';
import { yahooObjectToTicker } from '@aws/util';
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
      switchMap(([_, { transactions }]) => {
        return this.service
          .getTicker('VUSA.AS', transactions.stock[0].date)
          .pipe(
            mergeMap(({ body }) => {
              const ticker = yahooObjectToTicker(JSON.parse(body));
              return [getTickerSuccess({ ticker }), setChartData({ ticker })];
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
      switchMap(([_, { ticker }]) => {
        if (ticker.dates.length > 0) {
          return [setChartData({ ticker })];
        } else {
          return [];
        }
      })
    )
  );
}
