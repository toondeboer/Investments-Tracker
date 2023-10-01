import { createAction, props } from '@ngrx/store';

export const getData = createAction('[State] Get Data');
export const getDataSuccess = createAction(
  '[State] Get Data Success',
  props<{ data: string }>()
);
export const getDataFailure = createAction(
  '[State] Get Data Failure',
  props<{ error: string }>()
);

export const addData = createAction('[State] Add Data');
export const addDataSuccess = createAction(
  '[State] Add Data Success',
  props<{ data: string }>()
);
export const addDataFailure = createAction(
  '[State] Add Data Failure',
  props<{ error: string }>()
);
