import { createFeature, createReducer, on } from '@ngrx/store';
import {
  deleteTransactionSuccess,
  getDataSuccess,
  saveTransactionSuccess,
} from './state.actions';
import { Transaction } from '@aws/util';

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
    transactions: action.data.Items[0].transactions.map((transaction) => ({
      ...transaction,
      date: new Date(transaction.date),
    })),
  })),
  on(saveTransactionSuccess, deleteTransactionSuccess, (state, action) => ({
    ...state,
    transactions: action.transactions.map((transaction) => ({
      ...transaction,
      date: new Date(transaction.date),
    })),
  }))
);

export const feature = createFeature({ name: featureKey, reducer });
