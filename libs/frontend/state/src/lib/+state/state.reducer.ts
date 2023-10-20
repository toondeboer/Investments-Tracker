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
  Transactions,
  getDailyDates,
  getMostRecentValueFromList,
  getPortfolioValues,
  getTransactionAmountsAndValues,
  subtractLists,
  transactionsDboToTransactions,
} from '@aws/util';

export const featureKey = 'state';

export interface FeatureState {
  transactions: Transactions;
  summary: Summary;
  dates: Date[];
  chartData: ChartData;
}

export const initialState: FeatureState = {
  transactions: {
    stock: [],
    dividend: [],
    commission: [],
  },
  summary: {
    portfolioValue: 0,
    totalInvested: 0,
    amountOfShares: 0,
    averageSharePrice: 0,
    currentSharePrice: 0,
    totalDividend: 0,
    totalCommission: 0,
  },
  dates: [],
  chartData: {
    stock: {
      transactionAmounts: [],
      transactionValues: [],
      aggregatedAmounts: [],
      aggregatedValues: [],
    },
    dividend: {
      transactionAmounts: [],
      transactionValues: [],
      aggregatedAmounts: [],
      aggregatedValues: [],
    },
    commission: {
      transactionAmounts: [],
      transactionValues: [],
      aggregatedAmounts: [],
      aggregatedValues: [],
    },
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
      if (transactions.stock.length > 0) {
        const dates = getDailyDates(transactions.stock[0].date, new Date());

        const stockTransactionAmountsAndValues = getTransactionAmountsAndValues(
          dates,
          transactions.stock
        );
        const dividendTransactionAmountsAndValues =
          getTransactionAmountsAndValues(dates, transactions.dividend);
        const commissionTransactionAmountsAndValues =
          getTransactionAmountsAndValues(dates, transactions.commission);

        const totalInvested = getMostRecentValueFromList(
          stockTransactionAmountsAndValues.aggregatedValues
        );
        const amountOfShares = getMostRecentValueFromList(
          stockTransactionAmountsAndValues.aggregatedAmounts
        );

        const totalDividend = getMostRecentValueFromList(
          dividendTransactionAmountsAndValues.aggregatedValues
        );

        const totalCommission = getMostRecentValueFromList(
          commissionTransactionAmountsAndValues.aggregatedValues
        );

        return {
          ...state,
          dates,
          chartData: {
            ...state.chartData,
            stock: { ...stockTransactionAmountsAndValues },
            dividend: { ...dividendTransactionAmountsAndValues },
            commission: { ...commissionTransactionAmountsAndValues },
          },
          summary: {
            ...state.summary,
            totalInvested,
            amountOfShares,
            averageSharePrice: totalInvested / amountOfShares,
            totalDividend,
            totalCommission,
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
      state.chartData.stock.aggregatedAmounts,
      action.ticker
    );
    //TODO: calculate profit with commission/dividend
    const profit = subtractLists(
      portfolioValues,
      state.chartData.stock.aggregatedValues
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
