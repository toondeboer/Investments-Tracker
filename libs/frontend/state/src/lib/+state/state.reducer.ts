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
  getDividendPerQuarterByYear,
  getMostRecentValueFromList,
  getPortfolioValues,
  getReturn,
  getTransactionAmountsAndValues,
  subtractLists,
  transactionsDboToStocks,
  getDividendTtmPerQuarter,
  getDividendPerQuarter,
  getYieldPerYear,
  Stock,
  addLists,
  getStartDate,
  transactionsDboToTransactions,
} from '@aws/util';

export const featureKey = 'state';

export interface FeatureState {
  transactions: Transactions;
  stocks: { [ticker: string]: Stock };
  dates: Date[];
  summary: Summary;
}

export const initialState: FeatureState = {
  transactions: {
    stock: [],
    dividend: [],
    commission: [],
  },
  stocks: {},
  dates: [],
  summary: {
    portfolioValue: 0,
    totalInvested: 0,
    totalDividend: 0,
    totalCommission: 0,
    startDate: new Date(),
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
};

export const reducer = createReducer(
  initialState,
  on(getDataSuccess, (state, action) => ({
    ...state,
    transactions: transactionsDboToTransactions(action.data),
    stocks: transactionsDboToStocks(action.data),
  })),
  on(
    saveTransactionSuccess,
    deleteTransactionSuccess,
    deleteAllTransactionsSuccess,
    handleFileInputSuccess,
    (state, action) => ({
      ...state,
      transactions: transactionsDboToTransactions(action.transactions),
      stocks: transactionsDboToStocks(action.transactions),
    })
  ),
  on(
    getDataSuccess,
    saveTransactionSuccess,
    deleteTransactionSuccess,
    deleteAllTransactionsSuccess,
    handleFileInputSuccess,
    (state) => {
      const stocks = state.stocks;
      const startDate: Date = getStartDate(stocks);
      console.log('Started investing on: ', startDate);

      if (Object.keys(stocks).length > 0) {
        const dates = getDailyDates(startDate, new Date());

        let totalInvestedSummary = 0;
        let totalDividendSummary = 0;
        let totalCommissionSummary = 0;

        for (const key in stocks) {
          const stock = stocks[key];
          const transactions = stock.transactions;
          const stockTransactionAmountsAndValues =
            getTransactionAmountsAndValues(dates, transactions.stock);
          const dividendTransactionAmountsAndValues =
            getTransactionAmountsAndValues(dates, transactions.dividend);
          const dividendPerQuarterByYear = getDividendPerQuarterByYear(
            startDate,
            transactions.dividend
          );
          const dividendPerQuarter = getDividendPerQuarter(
            startDate,
            dividendPerQuarterByYear
          );
          const dividendTtmPerQuarter =
            getDividendTtmPerQuarter(dividendPerQuarter);

          const commissionTransactionAmountsAndValues =
            getTransactionAmountsAndValues(dates, transactions.commission);

          const totalInvested = getMostRecentValueFromList(
            stockTransactionAmountsAndValues.aggregatedValues
          ).value;
          totalInvestedSummary += totalInvested;
          const amountOfShares = getMostRecentValueFromList(
            stockTransactionAmountsAndValues.aggregatedAmounts
          ).value;

          const totalDividend = getMostRecentValueFromList(
            dividendTransactionAmountsAndValues.aggregatedValues
          ).value;
          totalDividendSummary += totalDividend;

          const totalCommission = getMostRecentValueFromList(
            commissionTransactionAmountsAndValues.aggregatedValues
          ).value;
          totalCommissionSummary += totalCommission;

          stocks[key] = {
            ...stock,
            chartData: {
              ...stock.chartData,
              stock: {
                ...stockTransactionAmountsAndValues,
              },
              dividend: {
                ...dividendTransactionAmountsAndValues,
                perQuarterByYear: dividendPerQuarterByYear,
                perQuarter: dividendPerQuarter,
                ttmPerQuarter: dividendTtmPerQuarter,
              },
              commission: { ...commissionTransactionAmountsAndValues },
            },
            summary: {
              ...stock.summary,
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
          dates,
          stocks,
          summary: {
            ...state.summary,
            totalInvested: totalInvestedSummary,
            totalDividend: totalDividendSummary,
            totalCommission: totalCommissionSummary,
            startDate,
          },
        };
      }
      return {
        ...state,
      };
    }
  ),
  on(setChartData, (state, action) => {
    const stocks = state.stocks;

    let portfolioValuesSummary = 0;
    let aggregatedPortfolioValues: number[] = [];
    let aggregatedProfit: number[] = [];

    const updatedStocks: { [ticker: string]: Stock } = {};
    for (const key of Object.keys(stocks)) {
      const stock = stocks[key];
      const ticker = action.tickers[key];

      const portfolioValues = getPortfolioValues(
        state.dates,
        stock.chartData.stock.aggregatedAmounts,
        ticker
      );
      aggregatedPortfolioValues =
        aggregatedPortfolioValues.length > 0
          ? addLists(aggregatedPortfolioValues, portfolioValues)
          : portfolioValues;
      const portfolioValue = getMostRecentValueFromList(portfolioValues).value;
      portfolioValuesSummary += portfolioValue;

      const profit = subtractLists(
        subtractLists(portfolioValues, stock.chartData.stock.aggregatedValues),
        stock.chartData.commission.aggregatedValues
      );
      aggregatedProfit =
        aggregatedProfit.length > 0
          ? addLists(aggregatedProfit, profit)
          : profit;

      const dailyReturn = getReturn(portfolioValues, profit, 1);
      const weeklyReturn = getReturn(portfolioValues, profit, 7);
      const monthlyReturn = getReturn(portfolioValues, profit, 30);
      const totalReturn = getReturn(
        portfolioValues,
        profit,
        portfolioValues.length
      );

      const yieldPerYear = getYieldPerYear(
        state.dates,
        portfolioValues,
        profit
      );
      updatedStocks[key] = {
        ...stock,
        summary: {
          ...stock.summary,
          portfolioValue,
          currentSharePrice: getMostRecentValueFromList(ticker.values).value,
          dailyReturn,
          weeklyReturn,
          monthlyReturn,
          totalReturn,
        },
        chartData: {
          ...stock.chartData,
          portfolioValues,
          profit,
          yieldPerYear,
        },
      };
    }

    const dailyReturnSummary = getReturn(
      aggregatedPortfolioValues,
      aggregatedProfit,
      1
    );
    const weeklyReturnSummary = getReturn(
      aggregatedPortfolioValues,
      aggregatedProfit,
      7
    );
    const monthlyReturnSummary = getReturn(
      aggregatedPortfolioValues,
      aggregatedProfit,
      30
    );
    const totalReturnSummary = getReturn(
      aggregatedPortfolioValues,
      aggregatedProfit,
      aggregatedPortfolioValues.length
    );

    return {
      ...state,
      stocks: updatedStocks,
      summary: {
        ...state.summary,
        portfolioValue: portfolioValuesSummary,
        dailyReturn: dailyReturnSummary,
        weeklyReturn: weeklyReturnSummary,
        monthlyReturn: monthlyReturnSummary,
        totalReturn: totalReturnSummary,
      },
    };
  })
);

export const feature = createFeature({ name: featureKey, reducer });
