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
  CsvInputEnglish,
  Stock,
  DividendTransactionChartData,
} from './types';

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

function getCurrency(currency: string): {
  value: string;
  yahooTicker: string | undefined;
} {
  const yahooTicker = (() => {
    switch (currency) {
      case 'USD':
        return 'EUR=X';
      case 'EUR':
      default:
        return undefined;
    }
  })();
  return { value: currency, yahooTicker };
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

export function yahooObjectsToTickers(yahooObjects: YahooObject[]): {
  [ticker: string]: Ticker;
} {
  console.log('Results from Yahoo: ', yahooObjects);
  return yahooObjects.reduce((acc, yahooObject) => {
    acc[yahooObject.symbol] = yahooObjectToTicker(yahooObject);
    return acc;
  }, {} as { [ticker: string]: Ticker });
}

export function yahooObjectToTicker(yahooObject: YahooObject): Ticker {
  const result = yahooObject.data.chart.result[0];
  let dividends: { date: Date; amountPerShare: number }[] = [];
  if (result.events) {
    const dividendEvents = result.events.dividends;
    dividends = Object.keys(dividendEvents).map((key) => ({
      date: new Date(dividendEvents[key].date * 1000),
      amountPerShare: dividendEvents[key].amount,
    }));
  }
  return {
    name: result.meta.symbol,
    currency: result.meta.currency,
    values: result.indicators.quote[0].close.map((v) => (v === null ? NaN : v)),
    dates: result.timestamp.map((time) => new Date(time * 1000)),
    dividends,
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
    const nanArray = Array(dates.length).fill(NaN);
    const zerosArray = Array(dates.length).fill(0);
    return {
      transactionAmounts: nanArray,
      transactionValues: nanArray,
      aggregatedAmounts: zerosArray,
      aggregatedValues: zerosArray,
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

export function getQuarter(month: number): number {
  return Math.floor((month - 1) / 3);
}

export function getDividendPerQuarterByYear(
  startDate: Date,
  dividends: Transaction[]
): { year: string; data: number[] }[] {
  const dividendsByYear: { [year: string]: number[] } = {};

  dividends.forEach((dividend) => {
    const year = dividend.date.getFullYear().toString();
    const quarter = getQuarter(dividend.date.getMonth());
    if (!dividendsByYear[year]) {
      dividendsByYear[year] = [0, 0, 0, 0];
    }
    dividendsByYear[year][quarter] += dividend.value;
  });

  const startYear = startDate.getFullYear();
  const endYear = new Date().getFullYear(); // Always go up to the current year

  const result: { year: string; data: number[] }[] = [];
  for (let year = startYear; year <= endYear; year++) {
    result.push({
      year: year.toString(),
      data: dividendsByYear[year] ?? [0, 0, 0, 0],
    });
  }

  return result;
}

export function getDividendPerQuarter(
  startDate: Date,
  dividendPerQuarterByYear: { year: string; data: number[] }[]
): { yearQuarters: YearQuarter[]; dividends: number[] } {
  const now = new Date();
  const yearQuarters: YearQuarter[] = [];
  const dividends: number[] = [];

  for (const dividendByYear of dividendPerQuarterByYear) {
    dividendByYear.data.forEach((dividend, quarter) => {
      if (
        (dividendByYear.year !== startDate.getFullYear().toString() ||
          quarter >= getQuarter(startDate.getMonth())) &&
        (dividendByYear.year !== now.getFullYear().toString() ||
          quarter <= getQuarter(now.getMonth()))
      ) {
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

function isCsvInputEnglish(
  input: CsvInput | CsvInputEnglish
): input is CsvInputEnglish {
  return (
    typeof input[0] == 'object' &&
    input[0] != null &&
    'Date' in input[0] &&
    'Description' in input[0] &&
    '' in input[0] &&
    'Product' in input[0]
  );
}

export function translateToDutch(csv: CsvInput | CsvInputEnglish): CsvInput {
  if (isCsvInputEnglish(csv)) {
    return csv.map((row) => ({
      Omschrijving: row.Description,
      Datum: row.Date,
      '': row[''],
      Product: row.Product,
    }));
  }

  return csv;
}

function getTickerFromGiroProduct(product: string): string {
  if (product == 'VANGUARD S&P 500 UCITS ETF USD') {
    return 'VUSA.AS';
  }
  return 'VUSA.AS';
}

export function parseCsvInput(csv: CsvInput): Transactions {
  const stock: Transaction[] = [];
  const dividend: Transaction[] = [];
  const commission: Transaction[] = [];

  for (const row of csv) {
    if (!row.Omschrijving || !row.Datum || !row['']) {
      continue;
    }

    const product = row.Product;
    const ticker = getTickerFromGiroProduct(product);

    if (row.Omschrijving.startsWith('Koop ')) {
      stock.push({
        ticker,
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
        currency: 'EUR',
      });
    }
    if (
      row.Omschrijving === 'DEGIRO Transactiekosten en/of kosten van derden'
    ) {
      commission.push({
        ticker,
        type: 'commission',
        date: new Date(
          parseInt(row.Datum.split('-')[2]),
          parseInt(row.Datum.split('-')[1]) - 1,
          parseInt(row.Datum.split('-')[0])
        ),
        amount: 1,
        value: Math.abs(parseFloat(row[''])),
        currency: 'EUR',
      });
    }
    if (row.Omschrijving === 'DEGIRO Verrekening Promotie') {
      commission.push({
        ticker,
        type: 'commission',
        date: new Date(
          parseInt(row.Datum.split('-')[2]),
          parseInt(row.Datum.split('-')[1]) - 1,
          parseInt(row.Datum.split('-')[0])
        ),
        amount: 1,
        value: -1 * Math.abs(parseFloat(row[''])),
        currency: 'EUR',
      });
    }
    if (row.Omschrijving === 'Valuta Creditering') {
      dividend.push({
        ticker,
        type: 'dividend',
        date: new Date(
          parseInt(row.Datum.split('-')[2]),
          parseInt(row.Datum.split('-')[1]) - 1,
          parseInt(row.Datum.split('-')[0])
        ),
        amount: 1,
        value: Math.abs(parseFloat(row[''])),
        currency: 'EUR',
      });
    }
  }

  return { stock, dividend, commission };
}

export function addLists(
  list1: number[],
  list2: number[],
  nanAsZero = false
): number[] {
  if (list1.length !== list2.length) {
    console.log(
      `WARNING: Lists are not the same size. (${list1.length}) - (${list2.length})`
    );
  }
  const result = [];
  for (let i = 0; i < list1.length; i++) {
    if (nanAsZero && Number.isNaN(list1[i]) !== Number.isNaN(list2[i])) {
      result.push(
        (Number.isNaN(list1[i]) ? 0 : list1[i]) +
          (Number.isNaN(list2[i]) ? 0 : list2[i])
      );
    } else {
      result.push(list1[i] + list2[i]);
    }
  }
  return result;
}

export function subtractLists(list1: number[], list2: number[]): number[] {
  if (list1.length !== list2.length) {
    console.log(
      `WARNING: Lists are not the same size. (${list1.length}) - (${list2.length})`
    );
  }
  const result = [];
  for (let i = 0; i < list1.length; i++) {
    result.push(list1[i] - list2[i]);
  }
  return result;
}

export function addPerQuarterByYearLists(
  list1: { year: string; data: number[] }[],
  list2: { year: string; data: number[] }[]
): { year: string; data: number[] }[] {
  if (list1.length !== list2.length) {
    console.log(
      `WARNING: Lists are not the same size. (${list1.length}) - (${list2.length})`
    );
    console.log(list1);
    console.log(list2);
  }
  const result = [];
  for (let i = 0; i < list1.length; i++) {
    if (list1[i].year !== list2[i].year) {
      console.log(
        `WARNING: years are not equal. (${list1[i].year}) - (${list2[i].year})`
      );
    }
    result.push({
      year: list1[i].year,
      data: addLists(list1[i].data, list2[i].data),
    });
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

export function updateDividends(
  dividend: DividendTransactionChartData,
  amountOfShares: number[],
  ticker: Ticker,
  dates: Date[],
  startDate: Date
): DividendTransactionChartData {
  const transactions: Transaction[] = ticker.dividends.map((dividend) => {
    const amount = getAmountOfSharesForDate(
      amountOfShares,
      dates,
      dividend.date
    );
    return {
      ticker: ticker.name,
      type: 'dividend',
      date: dividend.date,
      amount,
      value: dividend.amountPerShare * amount,
      currency: ticker.currency,
    };
  });

  const dividendTransactionAmountsAndValues = getTransactionAmountsAndValues(
    dates,
    transactions
  );
  const dividendPerQuarterByYear = getDividendPerQuarterByYear(
    startDate,
    transactions
  );
  const dividendPerQuarter = getDividendPerQuarter(
    startDate,
    dividendPerQuarterByYear
  );
  const dividendTtmPerQuarter = getDividendTtmPerQuarter(dividendPerQuarter);

  const result = {
    ...dividendTransactionAmountsAndValues,
    perQuarterByYear: dividendPerQuarterByYear,
    perQuarter: dividendPerQuarter,
    ttmPerQuarter: dividendTtmPerQuarter,
  };
  console.log('OLD, ', dividend);
  console.log('NEW', result);
  return result;
}

function getAmountOfSharesForDate(
  amountOfShares: number[],
  dates: Date[],
  date: Date
): number {
  if (amountOfShares.length !== dates.length) {
    console.log(
      `WARNING: Lists are not the same size. (${amountOfShares.length}) - (${dates.length})`
    );
  }
  const targetYear = date.getFullYear();
  const targetMonth = date.getMonth();
  const targetDay = date.getDate();

  for (let i = 0; i < dates.length; i++) {
    const d = dates[i];
    if (
      d.getFullYear() === targetYear &&
      d.getMonth() === targetMonth &&
      d.getDate() === targetDay
    ) {
      return amountOfShares[i];
    }
  }

  // If no match found
  console.log(`No matching date found for ${date}`);
  return 0;
}

export function getCurrencies(stocks: { [ticker: string]: Stock }): string[] {
  console.log(stocks);
  const currencies: string[] = [];
  for (const key of Object.keys(stocks)) {
    console.log(stocks[key]);
    const currency = stocks[key].currency.yahooTicker;
    if (currency && !currencies.includes(currency)) {
      currencies.push(currency);
    }
  }
  return currencies;
}
