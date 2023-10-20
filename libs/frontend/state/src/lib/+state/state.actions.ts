import {
  CsvInput,
  DatabaseObject,
  Ticker,
  Transactions,
  TransactionsDbo,
} from '@aws/util';
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
  props<{ transactions: Transactions }>()
);
export const saveTransactionSuccess = createAction(
  '[State] Save Transaction Success',
  props<{ transactions: TransactionsDbo }>()
);
export const saveTransactionFailure = createAction(
  '[State] Save Transaction Failure',
  props<{ error: string }>()
);

export const deleteTransaction = createAction(
  '[State] Delete Transaction',
  props<{ newTransactions: Transactions }>()
);
export const deleteTransactionSuccess = createAction(
  '[State] Delete Transaction Success',
  props<{ transactions: TransactionsDbo }>()
);
export const deleteTransactionFailure = createAction(
  '[State] Delete Transaction Failure',
  props<{ error: string }>()
);

export const deleteAllTransactions = createAction(
  '[State] Delete All Transactions'
);
export const deleteAllTransactionsSuccess = createAction(
  '[State] Delete All Transactions Success',
  props<{ transactions: TransactionsDbo }>()
);
export const deleteAllTransactionsFailure = createAction(
  '[State] Delete All Transactions Failure',
  props<{ error: string }>()
);

export const setChartData = createAction(
  '[State] Set Chart Data',
  props<{ ticker: Ticker }>()
);

export const handleFileInput = createAction(
  '[State] Handle File Input',
  props<{ data: CsvInput }>()
);
export const handleFileInputSuccess = createAction(
  '[State] Handle File InputSuccess',
  props<{ transactions: TransactionsDbo }>()
);
export const handleFileInputFailure = createAction(
  '[State] Handle File InputFailure',
  props<{ error: string }>()
);
