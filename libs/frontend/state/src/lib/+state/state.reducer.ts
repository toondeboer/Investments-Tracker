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
  getReturn,
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
    dailyReturn: {
      absolute: 0,
      percentage: 0,
    },
    weeklyReturn: {
      absolute: 0,
      percentage: 0,
    },
    monthlyReturn: {
      absolute: 0,
      percentage: 0,
    },
    totalReturn: {
      absolute: 0,
      percentage: 0,
    },
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
        ).value;
        const amountOfShares = getMostRecentValueFromList(
          stockTransactionAmountsAndValues.aggregatedAmounts
        ).value;

        const totalDividend = getMostRecentValueFromList(
          dividendTransactionAmountsAndValues.aggregatedValues
        ).value;

        const totalCommission = getMostRecentValueFromList(
          commissionTransactionAmountsAndValues.aggregatedValues
        ).value;

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
    const dailyReturn = getReturn(portfolioValues, profit, 1);
    const weeklyReturn = getReturn(portfolioValues, profit, 7);
    const monthlyReturn = getReturn(portfolioValues, profit, 30);
    const totalReturn = getReturn(
      portfolioValues,
      profit,
      portfolioValues.length
    );
    return {
      ...state,
      summary: {
        ...state.summary,
        portfolioValue: getMostRecentValueFromList(portfolioValues).value,
        currentSharePrice: getMostRecentValueFromList(action.ticker.values)
          .value,

        dailyReturn,
        weeklyReturn,
        monthlyReturn,
        totalReturn,
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
