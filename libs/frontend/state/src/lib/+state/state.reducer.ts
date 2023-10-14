import { createFeature, createReducer, on } from '@ngrx/store';
import {
  deleteAllTransactionsSuccess,
  deleteTransactionSuccess,
  getDataSuccess,
  handleFileInputSuccess,
  saveTransactionSuccess,
  setChartData,
} from './state.actions';
import {
  ChartData,
  Summary,
  Transaction,
  getDailyDates,
  getMostRecentPortfolioValue,
  getPortfolioValues,
  getTransactionAmountsAndValues,
  transactionsDboToTransactions,
} from '@aws/util';

export const featureKey = 'state';

export interface FeatureState {
  transactions: Transaction[];
  summary: Summary;
  dates: Date[];
  chartData: ChartData;
}

export const initialState: FeatureState = {
  transactions: [],
  summary: {
    portfolioValue: 0,
  },
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
  on(
    saveTransactionSuccess,
    deleteTransactionSuccess,
    deleteAllTransactionsSuccess,
    handleFileInputSuccess,
    (state, action) => ({
      ...state,
      transactions: transactionsDboToTransactions(action.transactions),
    })
  ),
  on(
    getDataSuccess,
    saveTransactionSuccess,
    deleteTransactionSuccess,
    deleteAllTransactionsSuccess,
    handleFileInputSuccess,
    (state) => {
      if (state.transactions.length > 0) {
        return {
          ...state,
          dates: getDailyDates(state.transactions[0].date, new Date()),
        };
      }
      return state;
    }
  ),
  on(
    getDataSuccess,
    saveTransactionSuccess,
    deleteTransactionSuccess,
    deleteAllTransactionsSuccess,
    handleFileInputSuccess,
    (state) => {
      if (state.transactions.length > 0) {
        return {
          ...state,
          chartData: {
            ...state.chartData,
            ...getTransactionAmountsAndValues(state.dates, state.transactions),
          },
        };
      }
      return state;
    }
  ),
  on(setChartData, (state, action) => {
    const portfolioValues = getPortfolioValues(
      state.dates,
      state.chartData.aggregatedAmounts,
      action.ticker
    );
    return {
      ...state,
      summary: { portfolioValue: getMostRecentPortfolioValue(portfolioValues) },
      chartData: {
        ...state.chartData,
        portfolioValues,
      },
    };
  })
);

export const feature = createFeature({ name: featureKey, reducer });
