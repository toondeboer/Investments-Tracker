import { createFeature, createReducer, on } from '@ngrx/store';
import {
  deleteTransactionSuccess,
  getDataSuccess,
  saveTransactionSuccess,
  setChartData,
} from './state.actions';
import {
  ChartData,
  Transaction,
  getDailyDates,
  getPortfolioValues,
  getTransactionAmountsAndValues,
  transactionsDboToTransactions,
} from '@aws/util';

export const featureKey = 'state';

export interface FeatureState {
  transactions: Transaction[];
  dates: Date[];
  chartData: ChartData;
}

export const initialState: FeatureState = {
  transactions: [],
  dates: [],
  chartData: {
    transactionAmounts: [],
    transactionValues: [],
    aggregatedAmounts: [],
    portfolioValues: [],
  },
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
      dates: getDailyDates(state.transactions[0].date, new Date()),
    })
  ),
  on(
    getDataSuccess,
    saveTransactionSuccess,
    deleteTransactionSuccess,
    (state) => ({
      ...state,
      chartData: {
        ...state.chartData,
        ...getTransactionAmountsAndValues(state.dates, state.transactions),
      },
    })
  ),
  on(setChartData, (state, action) => ({
    ...state,
    chartData: {
      ...state.chartData,
      portfolioValues: getPortfolioValues(
        state.dates,
        state.chartData.aggregatedAmounts,
        action.ticker
      ),
    },
  }))
);

export const feature = createFeature({ name: featureKey, reducer });
