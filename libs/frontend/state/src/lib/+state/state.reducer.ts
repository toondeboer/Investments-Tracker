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
  getMostRecentValueFromList,
  getPortfolioValues,
  getTransactionAmountsAndValues,
  subtractLists,
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
    totalInvested: 0,
    amountOfShares: 0,
    averageSharePrice: 0,
    currentSharePrice: 0,
  },
  dates: [],
  chartData: {
    transactionAmounts: [],
    transactionValues: [],
    aggregatedAmounts: [],
    aggregatedValues: [],
    portfolioValues: [],
    profit: [],
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
      const transactions = state.transactions;
      if (transactions.length > 0) {
        const dates = getDailyDates(transactions[0].date, new Date());
        const transactionAmountsAndValues = getTransactionAmountsAndValues(
          dates,
          transactions
        );
        const totalInvested = getMostRecentValueFromList(
          transactionAmountsAndValues.aggregatedValues
        );
        const amountOfShares = getMostRecentValueFromList(
          transactionAmountsAndValues.aggregatedAmounts
        );
        return {
          ...state,
          dates,
          chartData: { ...state.chartData, ...transactionAmountsAndValues },
          summary: {
            ...state.summary,
            totalInvested,
            amountOfShares,
            averageSharePrice: totalInvested / amountOfShares,
          },
        };
      }
      return {
        ...state,
        transactions,
      };
    }
  ),
  on(setChartData, (state, action) => {
    const portfolioValues = getPortfolioValues(
      state.dates,
      state.chartData.aggregatedAmounts,
      action.ticker
    );
    const profit = subtractLists(
      portfolioValues,
      state.chartData.aggregatedValues
    );
    return {
      ...state,
      summary: {
        ...state.summary,
        portfolioValue: getMostRecentValueFromList(portfolioValues),
        currentSharePrice: getMostRecentValueFromList(action.ticker.values),
      },
      chartData: {
        ...state.chartData,
        portfolioValues,
        profit,
      },
    };
  })
);

export const feature = createFeature({ name: featureKey, reducer });
