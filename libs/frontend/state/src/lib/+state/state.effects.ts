import { StateService } from './../state.service';
import { HttpErrorResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Store } from '@ngrx/store';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { switchMap, catchError, of, map } from 'rxjs';
import { getData, getDataFailure, getDataSuccess } from './state.actions';

@Injectable()
export class StateEffects {
  constructor(
    private store: Store,
    private readonly actions$: Actions,
    private readonly service: StateService
  ) {}

  public readonly getVision$ = createEffect(() =>
    this.actions$.pipe(
      ofType(getData),
      switchMap(() => {
        console.log('test');
        return this.service.getData().pipe(
          map((data) => getDataSuccess({ data })),
          catchError((error: HttpErrorResponse) =>
            of(getDataFailure({ error: error.message }))
          )
        );
      })
    )
  );
}
