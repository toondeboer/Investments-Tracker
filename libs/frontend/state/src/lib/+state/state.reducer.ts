import { createFeature, createReducer, on } from '@ngrx/store';
import {
  deleteTransactionSuccess,
  getDataSuccess,
  saveTransactionSuccess,
} from './state.actions';
import { Transaction, transactionsDboToTransactions } from '@aws/util';

export const featureKey = 'feature';

export interface FeatureState {
  transactions: Transaction[];
}

export const initialState: FeatureState = {
  transactions: [],
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
  }))
);

export const feature = createFeature({ name: featureKey, reducer });
