import { StateService } from './../state.service';
import { HttpErrorResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Store } from '@ngrx/store';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { switchMap, catchError, of, map } from 'rxjs';
import {
  addData,
  addDataFailure,
  addDataSuccess,
  getData,
  getDataFailure,
  getDataSuccess,
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
            console.log(databaseObject);
            return getDataSuccess({ data: databaseObject.Items[0].data });
          }),
          catchError((error: HttpErrorResponse) =>
            of(getDataFailure({ error: error.message }))
          )
        );
      })
    )
  );

  public readonly insertData$ = createEffect(() =>
    this.actions$.pipe(
      ofType(addData),
      switchMap(() => {
        return this.service.putData().pipe(
          map((databaseObject) => {
            console.log(databaseObject);
            return addDataSuccess({ data: databaseObject.Items[0].data });
          }),
          catchError((error: HttpErrorResponse) =>
            of(addDataFailure({ error: error.message }))
          )
        );
      })
    )
  );
}
