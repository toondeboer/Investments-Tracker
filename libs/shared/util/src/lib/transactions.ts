import {
  Stock,
  Transaction,
  TransactionDbo,
  TransactionKey,
  TransactionType,
  Transactions,
  TransactionsDbo,
} from './types';
import { isBeforeDay, isOnOrBeforeDay, isSameDay } from './core';

function initDefaultStock(ticker: string): Stock {
  return {
    ticker,
    transactions: {
      stock: [],
      dividend: [],
      commission: [],
    },
    summary: {
      portfolioValue: 0,
      totalInvested: 0,
      totalDividend: 0,
      totalCommission: 0,
      amountOfShares: 0,
      averageSharePrice: 0,
      currentSharePrice: 0,
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
        perQuarterByYear: [],
        perQuarter: { yearQuarters: [], dividends: [] },
        ttmPerQuarter: { yearQuarters: [], dividends: [] },
      },
      commission: {
        transactionAmounts: [],
        transactionValues: [],
        aggregatedAmounts: [],
        aggregatedValues: [],
      },
      portfolioValues: [],
      profit: [],
      yieldPerYear: { years: [], yields: [], profit: [] },
      allTimeDates: [],
      allTimePortfolioValues: [],
      allTimeProfit: [],
    },
    currency: { value: 'EUR' },
  };
}

export function transactionsDboToTransactions(
  transactions: TransactionsDbo
): Transactions {
  const stock: Transaction[] = [];
  const dividend: Transaction[] = [];
  const commission: Transaction[] = [];

  transactions.stock.forEach((transaction) => {
    const newTransaction: Transaction = {
      ...transaction,
      type: transaction.type as TransactionType,
      date: new Date(transaction.date),
    };
    stock.push(newTransaction);
  });

  transactions.dividend.forEach((transaction) => {
    const newTransaction: Transaction = {
      ...transaction,
      type: transaction.type as TransactionType,
      date: new Date(transaction.date),
    };
    dividend.push(newTransaction);
  });

  transactions.commission.forEach((transaction) => {
    const newTransaction: Transaction = {
      ...transaction,
      type: transaction.type as TransactionType,
      date: new Date(transaction.date),
    };
    commission.push(newTransaction);
  });

  return {
    stock: sortTransactions(stock),
    dividend: sortTransactions(dividend),
    commission: sortTransactions(commission),
  };
}

function getCurrency(currency: string): { value: string } {
  return { value: currency };
}

/**
 * Returns the Yahoo Finance FX ticker and optional sub-unit multiplier needed
 * to convert a stock's native currency into the chosen display currency.
 * Returns an empty object when no conversion is required (same currency) or
 * the pair is not supported.
 *
 * EUR=X  : USD → EUR rate  (multiply USD value to get EUR)
 * GBPEUR=X: GBP → EUR rate
 * EURUSD=X: EUR → USD rate
 * GBPUSD=X: GBP → USD rate
 * GBp is UK pence — use the GBP ticker then scale by 0.01.
 */
export function getFxTickerForConversion(
  stockCurrency: string,
  displayCurrency: string
): { yahooTicker?: string; fxMultiplier?: number } {
  if (stockCurrency === displayCurrency) return {};
  switch (displayCurrency) {
    case 'EUR':
      switch (stockCurrency) {
        case 'USD': return { yahooTicker: 'EUR=X' };
        case 'GBP': return { yahooTicker: 'GBPEUR=X' };
        case 'GBp': return { yahooTicker: 'GBPEUR=X', fxMultiplier: 0.01 };
        default:    return {};
      }
    case 'USD':
      switch (stockCurrency) {
        case 'EUR': return { yahooTicker: 'EURUSD=X' };
        case 'GBP': return { yahooTicker: 'GBPUSD=X' };
        case 'GBp': return { yahooTicker: 'GBPUSD=X', fxMultiplier: 0.01 };
        default:    return {};
      }
    default:
      return {};
  }
}

export function transactionsDboToStocks(transactions: TransactionsDbo): {
  [ticker: string]: Stock;
} {
  const stocks: { [ticker: string]: Stock } = {};

  transactions.stock.forEach((transaction) => {
    const newTransaction: Transaction = {
      ...transaction,
      type: transaction.type as TransactionType,
      date: new Date(transaction.date),
    };
    if (!stocks[transaction.ticker]) {
      stocks[transaction.ticker] = initDefaultStock(transaction.ticker);
      stocks[transaction.ticker].currency = getCurrency(transaction.currency);
    }
    stocks[transaction.ticker].transactions.stock.push(newTransaction);
    stocks[transaction.ticker].transactions.stock = sortTransactions(
      stocks[transaction.ticker].transactions.stock
    );
  });

  transactions.dividend.forEach((transaction) => {
    const newTransaction: Transaction = {
      ...transaction,
      type: transaction.type as TransactionType,
      date: new Date(transaction.date),
    };
    if (!stocks[transaction.ticker]) {
      stocks[transaction.ticker] = initDefaultStock(transaction.ticker);
      stocks[transaction.ticker].currency = getCurrency(transaction.currency);
    }
    stocks[transaction.ticker].transactions.dividend.push(newTransaction);
    stocks[transaction.ticker].transactions.dividend = sortTransactions(
      stocks[transaction.ticker].transactions.dividend
    );
  });

  transactions.commission.forEach((transaction) => {
    const newTransaction: Transaction = {
      ...transaction,
      type: transaction.type as TransactionType,
      date: new Date(transaction.date),
    };
    if (!stocks[transaction.ticker]) {
      stocks[transaction.ticker] = initDefaultStock(transaction.ticker);
      stocks[transaction.ticker].currency = getCurrency(transaction.currency);
    }
    stocks[transaction.ticker].transactions.commission.push(newTransaction);
    stocks[transaction.ticker].transactions.commission = sortTransactions(
      stocks[transaction.ticker].transactions.commission
    );
  });

  return stocks;
}

export function sortTransactions(transactions: Transaction[]): Transaction[] {
  return transactions.sort((t1, t2) => {
    if (t1.date < t2.date) {
      return -1;
    } else {
      return 1;
    }
  });
}

export function getTransactionAmountsAndValues(
  dates: Date[],
  transactions: Transaction[],
  initialAmount = 0,
  initialValue = 0
): {
  transactionAmounts: number[];
  transactionValues: number[];
  aggregatedAmounts: number[];
  aggregatedValues: number[];
} {
  const amounts: number[] = [];
  const values: number[] = [];
  const aggregatedAmounts: number[] = [];
  const aggregatedValues: number[] = [];

  if (transactions.length === 0) {
    const nanArray = Array(dates.length).fill(NaN);
    return {
      transactionAmounts: nanArray,
      transactionValues: nanArray,
      aggregatedAmounts: Array(dates.length).fill(initialAmount),
      aggregatedValues: Array(dates.length).fill(initialValue),
    };
  }

  // Skip pre-range transactions (those before the first date in the window).
  let index = 0;
  if (dates.length > 0) {
    while (index < transactions.length && isBeforeDay(transactions[index].date, dates[0])) {
      index++;
    }
  }

  let currentTransaction: Transaction = transactions[index];

  for (const date of dates) {
    if (index >= transactions.length || !isSameDay(date, currentTransaction.date)) {
      if (aggregatedAmounts.length === 0) {
        amounts.push(0);
        values.push(0);
        aggregatedAmounts.push(initialAmount);
        aggregatedValues.push(initialValue);
      } else {
        amounts.push(NaN);
        values.push(NaN);
        aggregatedAmounts.push(aggregatedAmounts[aggregatedAmounts.length - 1]);
        aggregatedValues.push(aggregatedValues[aggregatedValues.length - 1]);
      }
    } else {
      let newAmount = 0;
      let newValue = 0;
      while (index < transactions.length && isSameDay(date, currentTransaction.date)) {
        newAmount += currentTransaction.amount;
        newValue += currentTransaction.value;
        index += 1;
        if (index < transactions.length) {
          currentTransaction = transactions[index];
        }
      }
      amounts.push(newAmount);
      values.push(newValue);
      const prevAmount = aggregatedAmounts.length === 0 ? initialAmount : aggregatedAmounts[aggregatedAmounts.length - 1];
      const prevValue = aggregatedValues.length === 0 ? initialValue : aggregatedValues[aggregatedValues.length - 1];
      aggregatedAmounts.push(prevAmount + newAmount);
      aggregatedValues.push(prevValue + newValue);
    }
  }
  return {
    transactionAmounts: amounts,
    transactionValues: values,
    aggregatedAmounts,
    aggregatedValues,
  };
}

/**
 * Period-based variant of getTransactionAmountsAndValues for weekly/monthly
 * granularity. Each periodDate is the END of a period; transactions are
 * accumulated across the whole period rather than matched to an exact day.
 * Transactions before rangeStart are captured in the initial snapshot so
 * aggregatedAmounts/Values start from the correct historical baseline.
 */
export function getTransactionAmountsAndValuesByPeriod(
  periodDates: Date[],
  transactions: Transaction[],
  rangeStart: Date
): {
  transactionAmounts: number[];
  transactionValues: number[];
  aggregatedAmounts: number[];
  aggregatedValues: number[];
} {
  const transactionAmounts: number[] = [];
  const transactionValues: number[] = [];
  const aggregatedAmounts: number[] = [];
  const aggregatedValues: number[] = [];

  if (periodDates.length === 0) {
    return { transactionAmounts, transactionValues, aggregatedAmounts, aggregatedValues };
  }

  // Accumulate all pre-range transactions into the running snapshot.
  let runningAmount = 0;
  let runningValue = 0;
  let txIdx = 0;
  while (txIdx < transactions.length && isBeforeDay(transactions[txIdx].date, rangeStart)) {
    runningAmount += transactions[txIdx].amount;
    runningValue += transactions[txIdx].value;
    txIdx++;
  }

  let prevRunningAmount = runningAmount;
  let prevRunningValue = runningValue;

  for (const periodDate of periodDates) {
    while (txIdx < transactions.length && isOnOrBeforeDay(transactions[txIdx].date, periodDate)) {
      runningAmount += transactions[txIdx].amount;
      runningValue += transactions[txIdx].value;
      txIdx++;
    }

    const periodTxAmount = runningAmount - prevRunningAmount;
    const periodTxValue = runningValue - prevRunningValue;

    transactionAmounts.push(periodTxAmount !== 0 ? periodTxAmount : NaN);
    transactionValues.push(periodTxValue !== 0 ? periodTxValue : NaN);
    aggregatedAmounts.push(runningAmount);
    aggregatedValues.push(runningValue);

    prevRunningAmount = runningAmount;
    prevRunningValue = runningValue;
  }

  return { transactionAmounts, transactionValues, aggregatedAmounts, aggregatedValues };
}

/** Sums transaction amounts/values for all transactions strictly before asOf. */
export function computePreRangeSnapshot(
  transactions: Transaction[],
  asOf: Date
): { amount: number; value: number } {
  let amount = 0, value = 0;
  for (const tx of transactions) {
    if (isBeforeDay(tx.date, asOf)) {
      amount += tx.amount;
      value += tx.value;
    }
  }
  return { amount, value };
}

export function getStartDate(stocks: { [ticker: string]: Stock }): Date {
  let startDate: Date = new Date();

  for (const key in stocks) {
    const transactions = stocks[key].transactions;
    for (const transaction of transactions.stock) {
      startDate = transaction.date < startDate ? transaction.date : startDate;
    }
    for (const transaction of transactions.dividend) {
      startDate = transaction.date < startDate ? transaction.date : startDate;
    }
    for (const transaction of transactions.commission) {
      startDate = transaction.date < startDate ? transaction.date : startDate;
    }
  }

  return startDate;
}

export function getCurrencies(stocks: { [ticker: string]: Stock }): string[] {
  const set = new Set<string>();
  for (const stock of Object.values(stocks)) {
    for (const dc of ['EUR', 'USD']) {
      const { yahooTicker } = getFxTickerForConversion(stock.currency.value, dc);
      if (yahooTicker) set.add(yahooTicker);
    }
  }
  return [...set];
}

/**
 * Display symbol for a display-currency code. EUR and USD are the supported
 * display currencies; anything else falls back to the euro symbol.
 */
export function getCurrencySymbol(currency: string | null | undefined): string {
  return currency === 'USD' ? '$' : '€';
}

export function transactionToTransactionDbo(tx: Transaction): TransactionDbo {
  return {
    ticker: tx.ticker,
    type: tx.type,
    date: tx.date.toISOString().split('T')[0],
    time: tx.time,
    amount: tx.amount,
    value: tx.value,
    currency: tx.currency,
  };
}

function txDboKey(tx: TransactionDbo): string {
  return `${tx.ticker}|${tx.date}|${tx.time ?? ''}|${tx.value}`;
}

export function deduplicateTransactions(txs: TransactionDbo[]): TransactionDbo[] {
  const seen = new Set<string>();
  return txs.filter((tx) => {
    const key = txDboKey(tx);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function mergeTransactionsDbo(all: TransactionsDbo[]): TransactionsDbo {
  const stock: TransactionDbo[] = [];
  const dividend: TransactionDbo[] = [];
  const commission: TransactionDbo[] = [];
  for (const t of all) {
    stock.push(...t.stock);
    dividend.push(...t.dividend);
    commission.push(...t.commission);
  }
  return {
    stock: deduplicateTransactions(stock),
    dividend: deduplicateTransactions(dividend),
    commission: deduplicateTransactions(commission),
  };
}

export function mergeTransactions(
  existing: TransactionsDbo,
  incoming: TransactionsDbo
): TransactionsDbo {
  return mergeTransactionsDbo([existing, incoming]);
}

export function matchesTransactionKey(tx: TransactionDbo, key: TransactionKey): boolean {
  return (
    tx.type === key.type &&
    tx.ticker === key.ticker &&
    tx.date === key.date &&
    (tx.time ?? '') === (key.time ?? '') &&
    tx.value === key.value
  );
}
