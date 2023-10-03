import { createFeature, createReducer, on } from '@ngrx/store';
import { addDataSuccess, getDataSuccess } from './state.actions';
import { Transaction } from '@aws/util';

export const featureKey = 'feature';

export interface FeatureState {
  data: string;
  transactions: Transaction[];
}

function getDate(monthsAgo: number): Date {
  const date = new Date();
  date.setMonth(date.getMonth() - monthsAgo);
  return date;
}

export const initialState: FeatureState = {
  data: '',
  transactions: [
    {
      date: getDate(4),
      amount: 1,
      value: 5,
    },
    {
      date: getDate(3),
      amount: 2,
      value: 4,
    },
    {
      date: getDate(2),
      amount: 3,
      value: 6,
    },
    {
      date: getDate(1),
      amount: 4,
      value: 7,
    },
    { date: new Date(), amount: 5, value: 8 },
  ],
};

export const reducer = createReducer(
  initialState,
  on(addDataSuccess, (state, action) => ({ ...state, data: action.data })),
  on(getDataSuccess, (state, action) => ({ ...state, data: action.data }))
);

export const feature = createFeature({ name: featureKey, reducer });
