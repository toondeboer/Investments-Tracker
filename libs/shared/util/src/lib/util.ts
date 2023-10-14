import { Ticker, Transaction, TransactionDbo, YahooObject } from './types';

export function transactionsDboToTransactions(
  transactions: TransactionDbo[]
): Transaction[] {
  return transactions
    .map((transaction) => ({
      ...transaction,
      date: new Date(transaction.date),
    }))
    .sort((t1, t2) => {
      if (t1.date < t2.date) {
        return -1;
      } else {
        return 1;
      }
    });
}

export function yahooObjectToTicker(yahooObject: YahooObject): Ticker {
  const result = yahooObject.chart.result[0];
  return {
    name: result.meta.symbol,
    values: result.indicators.quote[0].close,
    dates: result.timestamp.map((time) => new Date(time * 1000)),
  };
}

export function getDailyDates(start: Date, end: Date): Date[] {
  const dates: Date[] = [];
  const currentDate = new Date(start);
  currentDate.setDate(currentDate.getDate() - 1);

  while (currentDate <= end) {
    dates.push(new Date(currentDate));
    currentDate.setDate(currentDate.getDate() + 1);
  }

  return dates;
}

export function isSameDay(date1: Date, date2: Date): boolean {
  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
  );
}

export function getTransactionAmountsAndValues(
  dates: Date[],
  transactions: Transaction[]
): {
  transactionAmounts: number[];
  transactionValues: number[];
  aggregatedAmounts: number[];
} {
  const amounts: number[] = [];
  const values: number[] = [];
  const aggregatedAmounts: number[] = [];
  let index = 0;
  let currentTransaction: Transaction = transactions[index];

  for (const date of dates) {
    if (!isSameDay(date, currentTransaction.date)) {
      amounts.push(NaN);
      values.push(NaN);
      if (aggregatedAmounts.length === 0) {
        aggregatedAmounts.push(0);
      } else {
        aggregatedAmounts.push(aggregatedAmounts[aggregatedAmounts.length - 1]);
      }
    } else {
      let newAmount = 0;
      let newValue = 0;
      while (isSameDay(date, currentTransaction.date)) {
        newAmount += currentTransaction.amount;
        newValue += currentTransaction.value;

        index += 1;
        if (index >= transactions.length) {
          break;
        }
        currentTransaction = transactions[index];
      }
      amounts.push(newAmount);
      values.push(newValue);
      if (aggregatedAmounts.length === 0) {
        aggregatedAmounts.push(newAmount);
      } else {
        aggregatedAmounts.push(
          aggregatedAmounts[aggregatedAmounts.length - 1] + newAmount
        );
      }
    }
  }
  return {
    transactionAmounts: amounts,
    transactionValues: values,
    aggregatedAmounts,
  };
}

export function getPortfolioValues(
  dates: Date[],
  aggregatedAmounts: number[],
  ticker: Ticker
): number[] {
  if (dates.length !== aggregatedAmounts.length) {
    console.log(`WARNING: Arrays are not of the same length.`);
  }

  const values: number[] = [];
  let index = 0;
  let currentDate: Date = ticker.dates[index];
  let currentValue: number = ticker.values[index];

  for (let i = 0; i < dates.length; i++) {
    if (!isSameDay(dates[i], currentDate)) {
      if (values.length === 0 || values[values.length - 1] === 0) {
        values.push(0);
      } else {
        values.push(NaN);
      }
    } else {
      let newValue = 0;
      while (isSameDay(dates[i], currentDate)) {
        newValue += currentValue * aggregatedAmounts[i];
        index += 1;
        if (index >= ticker.values.length) {
          break;
        }
        currentDate = ticker.dates[index];
        currentValue = ticker.values[index];
      }

      values.push(newValue);
    }
  }
  return values;
}
