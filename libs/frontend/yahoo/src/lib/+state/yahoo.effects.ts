import { HttpErrorResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Store } from '@ngrx/store';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { switchMap, catchError, of, map } from 'rxjs';
import { YahooService } from '../yahoo.service';
import { getTicker, getTickerFailure, getTickerSuccess } from './yahoo.actions';
import { YahooObject, yahooObjectToTicker } from '@aws/util';

@Injectable()
export class YahooEffects {
  constructor(
    private store: Store,
    private readonly actions$: Actions,
    private readonly service: YahooService
  ) {}

  public readonly getTicker$ = createEffect(() =>
    this.actions$.pipe(
      ofType(getTicker),
      switchMap(() => {
        console.log('effects');
        return this.service.getTicker('AAPL').pipe(
          map((yahooObject) => {
            const ticker = yahooObjectToTicker(yahooObject);
            return getTickerSuccess({ ticker });
          }),
          catchError((error: HttpErrorResponse) =>
            of(getTickerFailure({ error: error.message }))
          )
        );
      })
    )
  );
}
