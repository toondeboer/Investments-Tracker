import { StateService } from './../state.service';
import { HttpErrorResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Store } from '@ngrx/store';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { switchMap, catchError, of, map } from 'rxjs';
import {
  deleteAllTransactions,
  deleteAllTransactionsFailure,
  deleteAllTransactionsSuccess,
  deleteTransaction,
  deleteTransactionFailure,
  deleteTransactionSuccess,
  getData,
  getDataFailure,
  getDataSuccess,
  handleFileInput,
  handleFileInputFailure,
  handleFileInputSuccess,
  saveTransaction,
  saveTransactionFailure,
  saveTransactionSuccess,
} from './state.actions';
import { Transactions, parseCsvInput } from '@aws/util';

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
      switchMap(({ transactions }) => {
        return this.service.setTransactions(transactions).pipe(
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

  public readonly deleteAllTransactions$ = createEffect(() =>
    this.actions$.pipe(
      ofType(deleteAllTransactions),
      switchMap(() => {
        return this.service
          .setTransactions({ stock: [], commission: [], dividend: [] })
          .pipe(
            map(({ Attributes }) => {
              return deleteAllTransactionsSuccess({
                transactions: Attributes.transactions,
              });
            }),
            catchError((error: HttpErrorResponse) =>
              of(deleteAllTransactionsFailure({ error: error.message }))
            )
          );
      })
    )
  );

  public readonly handleFileInput$ = createEffect(() =>
    this.actions$.pipe(
      ofType(handleFileInput),
      switchMap(({ data }) => {
        const newTransactions: Transactions = parseCsvInput(data);

        return this.service.setTransactions(newTransactions).pipe(
          map(({ Attributes }) => {
            return handleFileInputSuccess({
              transactions: Attributes.transactions,
            });
          }),
          catchError((error: HttpErrorResponse) =>
            of(handleFileInputFailure({ error: error.message }))
          )
        );
      })
    )
  );
}
