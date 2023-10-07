import {
  ChartData,
  Ticker,
  Transaction,
  TransactionDbo,
  YahooObject,
} from './types';

export function transactionToChartData(transactions: Transaction[]): ChartData {
  if (transactions.length === 0) {
    return { x: [new Date().toDateString()], data: [0] };
  }
  const x: string[] = [];
  const data: number[] = [];
  for (const transaction of transactions) {
    x.push(transaction.date.toDateString());
    data.push(transaction.amount * transaction.value);
  }
  return { x, data };
}

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
