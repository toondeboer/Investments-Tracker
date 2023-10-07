import { StateService } from './../state.service';
import { HttpErrorResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Store } from '@ngrx/store';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { switchMap, catchError, of, map } from 'rxjs';
import {
  deleteTransaction,
  deleteTransactionFailure,
  deleteTransactionSuccess,
  getData,
  getDataFailure,
  getDataSuccess,
  saveTransaction,
  saveTransactionFailure,
  saveTransactionSuccess,
} from './state.actions';

@Injectable()
export class StateEffects {
  constructor(
    private store: Store,
    private readonly actions$: Actions,
    private readonly service: StateService
  ) {}

  public readonly getData$ = createEffect(() =>
    this.actions$.pipe(
      ofType(getData),
      switchMap(() => {
        return this.service.getData().pipe(
          map((databaseObject) => {
            return getDataSuccess({ data: databaseObject });
          }),
          catchError((error: HttpErrorResponse) =>
            of(getDataFailure({ error: error.message }))
          )
        );
      })
    )
  );

  public readonly saveTransaction$ = createEffect(() =>
    this.actions$.pipe(
      ofType(saveTransaction),
      switchMap(({ transaction }) => {
        return this.service.saveTransaction(transaction).pipe(
          map(({ Attributes }) => {
            return saveTransactionSuccess({
              transactions: Attributes.transactions,
            });
          }),
          catchError((error: HttpErrorResponse) =>
            of(saveTransactionFailure({ error: error.message }))
          )
        );
      })
    )
  );

  public readonly deleteTransaction$ = createEffect(() =>
    this.actions$.pipe(
      ofType(deleteTransaction),
      switchMap(({ newTransactions }) => {
        return this.service.setTransactions(newTransactions).pipe(
          map(({ Attributes }) => {
            return deleteTransactionSuccess({
              transactions: Attributes.transactions,
            });
          }),
          catchError((error: HttpErrorResponse) =>
            of(deleteTransactionFailure({ error: error.message }))
          )
        );
      })
    )
  );
}
