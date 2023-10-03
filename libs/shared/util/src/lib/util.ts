import { ChartData, Transaction } from './types';

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
