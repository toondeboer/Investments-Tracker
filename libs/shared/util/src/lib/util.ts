import {
  CsvInput,
  Return,
  Ticker,
  Transaction,
  TransactionType,
  Transactions,
  TransactionsDbo,
  YahooObject,
  YearQuarter,
} from './types';

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

export function sortTransactions(transactions: Transaction[]): Transaction[] {
  return transactions.sort((t1, t2) => {
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
    values: result.indicators.quote[0].close.map((v) => (v === null ? NaN : v)),
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
  aggregatedValues: number[];
} {
  const amounts: number[] = [];
  const values: number[] = [];
  const aggregatedAmounts: number[] = [];
  const aggregatedValues: number[] = [];
  let index = 0;
  let currentTransaction: Transaction = transactions[index];

  if (transactions.length === 0) {
    return {
      transactionAmounts: amounts,
      transactionValues: values,
      aggregatedAmounts,
      aggregatedValues,
    };
  }

  for (const date of dates) {
    if (!isSameDay(date, currentTransaction.date)) {
      if (aggregatedAmounts.length === 0) {
        amounts.push(0);
        values.push(0);
        aggregatedAmounts.push(0);
        aggregatedValues.push(0);
      } else {
        amounts.push(NaN);
        values.push(NaN);
        aggregatedAmounts.push(aggregatedAmounts[aggregatedAmounts.length - 1]);
        aggregatedValues.push(aggregatedValues[aggregatedValues.length - 1]);
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
        aggregatedValues.push(newValue);
      } else {
        aggregatedAmounts.push(
          aggregatedAmounts[aggregatedAmounts.length - 1] + newAmount
        );
        aggregatedValues.push(
          aggregatedValues[aggregatedValues.length - 1] + newValue
        );
      }
    }
  }
  return {
    transactionAmounts: amounts,
    transactionValues: values,
    aggregatedAmounts,
    aggregatedValues,
  };
}

export function getDividendPerQuarterByYear(
  dividends: Transaction[]
): { year: string; data: number[] }[] {
  const dividendsByYear: { [year: string]: number[] } = {};

  dividends.forEach((dividend) => {
    const year = dividend.date.getFullYear().toString();
    const quarter = Math.floor(dividend.date.getMonth() / 3);
    if (!dividendsByYear[year]) {
      dividendsByYear[year] = [0, 0, 0, 0];
    }
    dividendsByYear[year][quarter] += dividend.value;
  });

  return Object.keys(dividendsByYear).map((year) => ({
    year,
    data: dividendsByYear[year],
  }));
}

export function getDividendPerQuarter(
  dividendPerQuarterByYear: { year: string; data: number[] }[]
): { yearQuarters: YearQuarter[]; dividends: number[] } {
  const yearQuarters: YearQuarter[] = [];
  const dividends: number[] = [];

  for (const dividendByYear of dividendPerQuarterByYear) {
    dividendByYear.data.forEach((dividend, quarter) => {
      if (dividend > 0) {
        yearQuarters.push({
          year: dividendByYear.year,
          quarter,
        });
        dividends.push(dividend);
      }
    });
  }

  return { yearQuarters, dividends };
}

export function getDividendTtmPerQuarter(dividendPerQuarter: {
  yearQuarters: YearQuarter[];
  dividends: number[];
}): { yearQuarters: YearQuarter[]; dividends: number[] } {
  return {
    yearQuarters: dividendPerQuarter.yearQuarters,
    dividends: dividendPerQuarter.dividends.map((_, i) => {
      const start = Math.max(0, i - 3);
      const end = i + 1;

      return dividendPerQuarter.dividends
        .slice(start, end)
        .reduce((acc, val) => acc + val, 0);
    }),
  };
}

export function getYieldPerYear(
  dates: Date[],
  portfolioValues: number[],
  profitValues: number[]
): { years: string[]; yields: number[]; profit: number[] } {
  const years: string[] = [];
  const yields: number[] = [];
  const profit: number[] = [];
  let profitLastYear = 0;
  dates.forEach((date, index) => {
    if (
      (date.getMonth() === 11 && date.getDate() === 31) ||
      index + 1 === dates.length
    ) {
      years.push(date.getFullYear().toString());
      const profitThisYear =
        getMostRecentValueAtIndex(profitValues, index) - profitLastYear;
      profit.push(profitThisYear);
      yields.push(
        (100 * profitThisYear) /
          getMostRecentValueAtIndex(portfolioValues, index)
      );
      profitLastYear = profitThisYear;
    }
  });
  return { years, yields, profit };
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

export function getMostRecentValueFromList(values: number[]): {
  value: number;
  index: number;
} {
  let index = values.length - 1;
  while (index >= 0) {
    if (values[index]) {
      return { value: values[index], index };
    }
    index -= 1;
  }

  return { value: 0, index: 0 };
}

function getMostRecentValueAtIndex(values: number[], index: number) {
  return getMostRecentValueFromList(values.slice(0, index + 1)).value;
}

export function parseCsvInput(csv: CsvInput): Transactions {
  const stock: Transaction[] = [];
  const dividend: Transaction[] = [];
  const commission: Transaction[] = [];

  for (const row of csv) {
    if (!row.Omschrijving || !row.Datum || !row['']) {
      continue;
    }
    if (row.Omschrijving.startsWith('Koop ')) {
      stock.push({
        type: 'stock',
        date: new Date(
          parseInt(row.Datum.split('-')[2]),
          parseInt(row.Datum.split('-')[1]) - 1,
          parseInt(row.Datum.split('-')[0])
        ),
        amount: parseFloat(
          row.Omschrijving.replace('Koop ', '').split(' @')[0]
        ),
        value: Math.abs(parseFloat(row[''])),
      });
    }
    if (
      row.Omschrijving === 'DEGIRO Transactiekosten en/of kosten van derden'
    ) {
      commission.push({
        type: 'commission',
        date: new Date(
          parseInt(row.Datum.split('-')[2]),
          parseInt(row.Datum.split('-')[1]) - 1,
          parseInt(row.Datum.split('-')[0])
        ),
        amount: 1,
        value: Math.abs(parseFloat(row[''])),
      });
    }
    if (row.Omschrijving === 'DEGIRO Verrekening Promotie') {
      commission.push({
        type: 'commission',
        date: new Date(
          parseInt(row.Datum.split('-')[2]),
          parseInt(row.Datum.split('-')[1]) - 1,
          parseInt(row.Datum.split('-')[0])
        ),
        amount: 1,
        value: -1 * Math.abs(parseFloat(row[''])),
      });
    }
    if (row.Omschrijving === 'Valuta Creditering') {
      dividend.push({
        type: 'dividend',
        date: new Date(
          parseInt(row.Datum.split('-')[2]),
          parseInt(row.Datum.split('-')[1]) - 1,
          parseInt(row.Datum.split('-')[0])
        ),
        amount: 1,
        value: Math.abs(parseFloat(row[''])),
      });
    }
  }

  return { stock, dividend, commission };
}

export function subtractLists(list1: number[], list2: number[]): number[] {
  if (list1.length !== list2.length) {
    console.log(`WARNING: Lists are not the same size.`);
  }
  const result = [];
  for (let i = 0; i < list1.length; i++) {
    result.push(list1[i] - list2[i]);
  }
  return result;
}

export function getReturn(
  portfolioValues: number[],
  profit: number[],
  days: number
): Return {
  const mostRecentProfit = getMostRecentValueFromList(profit);
  const profitDaysAgo = getMostRecentValueFromList(
    profit.slice(
      0,
      mostRecentProfit.index - days < 0 ? 0 : mostRecentProfit.index - days
    )
  );
  const absolute = mostRecentProfit.value - profitDaysAgo.value;

  return {
    absolute,
    percentage:
      (absolute / getMostRecentValueFromList(portfolioValues).value) * 100,
  };
}
