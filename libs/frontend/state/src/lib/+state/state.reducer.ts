import { createFeature, createReducer, on } from '@ngrx/store';
import {
  deleteTransactionSuccess,
  getDataSuccess,
  saveTransactionSuccess,
} from './state.actions';
import {
  Transaction,
  getDailyDates,
  transactionsDboToTransactions,
} from '@aws/util';

export const featureKey = 'state';

export interface FeatureState {
  transactions: Transaction[];
  dates: Date[];
}

export const initialState: FeatureState = {
  transactions: [],
  dates: [],
};

export const reducer = createReducer(
  initialState,
  on(getDataSuccess, (state, action) => ({
    ...state,
    transactions: transactionsDboToTransactions(
      action.data.Items[0].transactions
    ),
  })),
  on(saveTransactionSuccess, deleteTransactionSuccess, (state, action) => ({
    ...state,
    transactions: transactionsDboToTransactions(action.transactions),
  })),
  on(
    getDataSuccess,
    saveTransactionSuccess,
    deleteTransactionSuccess,
    (state) => ({
      ...state,
      dates: getDailyDates(
        state.transactions[0].date,
        state.transactions[state.transactions.length - 1].date
      ),
    })
  )
);

export const feature = createFeature({ name: featureKey, reducer });
