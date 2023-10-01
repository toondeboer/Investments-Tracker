import { createFeature, createReducer, on } from '@ngrx/store';
import { addDataSuccess, getDataSuccess } from './state.actions';

export const featureKey = 'feature';

export interface FeatureState {
  data: string;
  transactions: {
    date: Date;
    amount: number;
    value: number;
  }[];
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
      amount: 1,
      value: 5,
    },
    {
      date: getDate(2),
      amount: 1,
      value: 5,
    },
    {
      date: getDate(1),
      amount: 1,
      value: 5,
    },
    { date: new Date(), amount: 1, value: 5 },
  ],
};

export const reducer = createReducer(
  initialState,
  on(addDataSuccess, (state, action) => ({ ...state, data: action.data })),
  on(getDataSuccess, (state, action) => ({ ...state, data: action.data }))
);

export const feature = createFeature({ name: featureKey, reducer });
