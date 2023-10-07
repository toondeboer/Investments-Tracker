import { DatabaseObject, Transaction, TransactionDbo } from '@aws/util';
import { createAction, props } from '@ngrx/store';

export const getData = createAction('[State] Get Data');
export const getDataSuccess = createAction(
  '[State] Get Data Success',
  props<{ data: DatabaseObject }>()
);
export const getDataFailure = createAction(
  '[State] Get Data Failure',
  props<{ error: string }>()
);

export const saveTransaction = createAction(
  '[State] Save Transaction',
  props<{ transaction: Transaction }>()
);
export const saveTransactionSuccess = createAction(
  '[State] Save Transaction Success',
  props<{ transactions: TransactionDbo[] }>()
);
export const saveTransactionFailure = createAction(
  '[State] Save Transaction Failure',
  props<{ error: string }>()
);

export const deleteTransaction = createAction(
  '[State] Delete Transaction',
  props<{ newTransactions: Transaction[] }>()
);
export const deleteTransactionSuccess = createAction(
  '[State] Delete Transaction Success',
  props<{ transactions: TransactionDbo[] }>()
);
export const deleteTransactionFailure = createAction(
  '[State] Delete Transaction Failure',
  props<{ error: string }>()
);
