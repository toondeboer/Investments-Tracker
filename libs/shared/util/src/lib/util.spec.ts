import {
  CsvInput,
  Ticker,
  Transaction,
  TransactionDbo,
  TransactionType,
  Transactions,
  TransactionsDbo,
  YahooObject,
} from './types';
import {
  addLists,
  getCurrencies,
  getDailyDates,
  getDividendPerQuarterByYear,
  getDividendTtmPerQuarter,
  getMostRecentValueFromList,
  getPortfolioValues,
  getQuarter,
  getReturn,
  getStartDate,
  getTransactionAmountsAndValues,
  getYieldPerYear,
  isSameDay,
  parseCsvInput,
  sortTransactions,
  subtractLists,
  transactionsDboToStocks,
  transactionsDboToTransactions,
  yahooObjectToTicker,
} from './util';

// --- helpers ---------------------------------------------------------------

function tx(
  date: Date,
  amount: number,
  value: number,
  type: TransactionType = 'stock'
): Transaction {
  return { ticker: 'VUSA.AS', type, date, amount, value, currency: 'EUR' };
}

function dbo(
  date: string,
  amount: number,
  value: number,
  type: TransactionType = 'stock',
  currency = 'EUR'
): TransactionDbo {
  return { ticker: 'VUSA.AS', type, date, amount, value, currency };
}

// ---------------------------------------------------------------------------

describe('parseCsvInput', () => {
  const product = 'VANGUARD S&P 500 UCITS ETF USD';

  // Build a single DEGIRO CSV row (Dutch column names + the unnamed amount column).
  function row(
    Datum: string,
    Omschrijving: string,
    amount: string
  ): CsvInput[number] {
    return { Datum, Product: product, Omschrijving, '': amount };
  }

  it('parses a "Koop" row into a stock transaction', () => {
    const result = parseCsvInput([
      row('03-10-2023', 'Koop 6 @ 77,177 EUR', '-463.06'),
    ]);

    const expected: Transactions = {
      stock: [
        {
          ticker: 'VUSA.AS',
          type: 'stock',
          date: new Date(2023, 9, 3),
          amount: 6,
          value: 463.06,
          currency: 'EUR',
        },
      ],
      dividend: [],
      commission: [],
    };

    expect(result).toEqual(expected);
  });

  it('parses commission, promotion and dividend rows', () => {
    const result = parseCsvInput([
      row(
        '04-10-2023',
        'DEGIRO Transactiekosten en/of kosten van derden',
        '-1.50'
      ),
      row('05-10-2023', 'DEGIRO Verrekening Promotie', '-2.00'),
      row('06-10-2023', 'Valuta Creditering', '12.34'),
    ]);

    expect(result.commission).toEqual([
      {
        ticker: 'VUSA.AS',
        type: 'commission',
        date: new Date(2023, 9, 4),
        amount: 1,
        value: 1.5,
        currency: 'EUR',
      },
      // A promotion credit is a negative "commission" (it reduces costs).
      {
        ticker: 'VUSA.AS',
        type: 'commission',
        date: new Date(2023, 9, 5),
        amount: 1,
        value: -2,
        currency: 'EUR',
      },
    ]);
    expect(result.dividend).toEqual([
      {
        ticker: 'VUSA.AS',
        type: 'dividend',
        date: new Date(2023, 9, 6),
        amount: 1,
        value: 12.34,
        currency: 'EUR',
      },
    ]);
    expect(result.stock).toEqual([]);
  });

  it('skips rows missing a date, description or amount', () => {
    const result = parseCsvInput([
      row('', 'Koop 6 @ 77,177 EUR', '-463.06'),
      row('03-10-2023', '', '-463.06'),
      row('03-10-2023', 'Koop 6 @ 77,177 EUR', ''),
    ]);

    const expected: Transactions = { stock: [], dividend: [], commission: [] };
    expect(result).toEqual(expected);
  });
});

describe('getMostRecentValueFromList', () => {
  it('returns the last truthy value and its index', () => {
    expect(getMostRecentValueFromList([1, 2, 3])).toEqual({ value: 3, index: 2 });
  });

  it('skips trailing zeros and NaNs (treated as "no value yet")', () => {
    expect(getMostRecentValueFromList([1, 2, 0])).toEqual({ value: 2, index: 1 });
    expect(getMostRecentValueFromList([5, NaN, NaN])).toEqual({
      value: 5,
      index: 0,
    });
  });

  it('returns the zero fallback for empty / all-falsy lists', () => {
    expect(getMostRecentValueFromList([])).toEqual({ value: 0, index: 0 });
    expect(getMostRecentValueFromList([0, 0, 0])).toEqual({ value: 0, index: 0 });
  });
});

describe('addLists / subtractLists', () => {
  it('adds element-wise', () => {
    expect(addLists([1, 2, 3], [4, 5, 6])).toEqual([5, 7, 9]);
  });

  it('propagates NaN by default', () => {
    expect(addLists([1, NaN], [2, 3])).toEqual([3, NaN]);
  });

  it('treats a lone NaN as zero when nanAsZero is set', () => {
    expect(addLists([1, NaN], [2, 3], true)).toEqual([3, 3]);
    // both NaN -> still NaN; one NaN -> the other value
    expect(addLists([NaN, NaN], [NaN, 3], true)).toEqual([NaN, 3]);
  });

  it('subtracts element-wise', () => {
    expect(subtractLists([5, 7, 9], [1, 2, 3])).toEqual([4, 5, 6]);
  });
});

describe('getReturn', () => {
  const portfolioValues = [200, 200, 200];
  const profit = [5, 10, 20];

  it('computes the 1-day absolute and percentage return', () => {
    // most recent profit 20 (index 2); profit one day ago = 5 -> absolute 15
    expect(getReturn(portfolioValues, profit, 1)).toEqual({
      absolute: 15,
      percentage: 7.5, // 15 / 200 * 100
    });
  });

  it('computes the 2-day return (no earlier value -> baseline 0)', () => {
    expect(getReturn(portfolioValues, profit, 2)).toEqual({
      absolute: 20,
      percentage: 10, // 20 / 200 * 100
    });
  });

  it('guards divide-by-zero when the portfolio value is 0', () => {
    expect(getReturn([0, 0, 0], [5, 10], 1)).toEqual({
      absolute: 10,
      percentage: 0,
    });
  });
});

describe('getQuarter', () => {
  it('maps months (0-11) to quarter indexes (0-3)', () => {
    expect([0, 2, 3, 5, 6, 8, 9, 11].map(getQuarter)).toEqual([
      0, 0, 1, 1, 2, 2, 3, 3,
    ]);
  });
});

describe('isSameDay', () => {
  it('ignores the time component', () => {
    expect(
      isSameDay(new Date(2023, 0, 2, 9, 30), new Date(2023, 0, 2, 23, 59))
    ).toBe(true);
    expect(isSameDay(new Date(2023, 0, 2), new Date(2023, 0, 3))).toBe(false);
  });
});

describe('getDailyDates', () => {
  it('returns every day from the day before start through end (inclusive)', () => {
    const result = getDailyDates(new Date(2023, 0, 2), new Date(2023, 0, 3));
    expect(result).toEqual([
      new Date(2023, 0, 1),
      new Date(2023, 0, 2),
      new Date(2023, 0, 3),
    ]);
  });
});

describe('getTransactionAmountsAndValues', () => {
  it('returns NaN/zero baselines for an empty transaction list', () => {
    const dates = [new Date(2023, 0, 1), new Date(2023, 0, 2)];
    expect(getTransactionAmountsAndValues(dates, [])).toEqual({
      transactionAmounts: [NaN, NaN],
      transactionValues: [NaN, NaN],
      aggregatedAmounts: [0, 0],
      aggregatedValues: [0, 0],
    });
  });

  it('aggregates a single buy and carries the total forward', () => {
    const dates = [
      new Date(2023, 0, 1),
      new Date(2023, 0, 2),
      new Date(2023, 0, 3),
    ];
    const transactions = [tx(new Date(2023, 0, 2), 6, 463.06)];

    expect(getTransactionAmountsAndValues(dates, transactions)).toEqual({
      transactionAmounts: [0, 6, NaN],
      transactionValues: [0, 463.06, NaN],
      aggregatedAmounts: [0, 6, 6],
      aggregatedValues: [0, 463.06, 463.06],
    });
  });

  it('sums multiple transactions that fall on the same day', () => {
    const dates = [new Date(2023, 0, 1), new Date(2023, 0, 2)];
    const transactions = [
      tx(new Date(2023, 0, 2), 2, 100),
      tx(new Date(2023, 0, 2), 3, 150),
    ];

    const result = getTransactionAmountsAndValues(dates, transactions);
    expect(result.transactionAmounts).toEqual([0, 5]);
    expect(result.transactionValues).toEqual([0, 250]);
    expect(result.aggregatedAmounts).toEqual([0, 5]);
    expect(result.aggregatedValues).toEqual([0, 250]);
  });
});

describe('getPortfolioValues', () => {
  it('multiplies the share count by the price on matching days', () => {
    const dates = [new Date(2023, 0, 1), new Date(2023, 0, 2)];
    const aggregatedAmounts = [0, 6];
    const ticker: Ticker = {
      name: 'VUSA.AS',
      currency: 'EUR',
      dates: [new Date(2023, 0, 1), new Date(2023, 0, 2)],
      values: [100, 110],
      dividends: [],
    };

    expect(getPortfolioValues(dates, aggregatedAmounts, ticker)).toEqual([
      0, // 100 * 0 shares
      660, // 110 * 6 shares
    ]);
  });
});

describe('getDividendPerQuarterByYear', () => {
  it('buckets dividends by year and quarter, padding to the current year', () => {
    const startDate = new Date(2023, 0, 1);
    const dividends = [tx(new Date(2023, 9, 6), 1, 12.34, 'dividend')]; // Oct -> Q3

    const result = getDividendPerQuarterByYear(startDate, dividends);

    // First bucket is the start year with the dividend in Q3 (index 3).
    expect(result[0]).toEqual({ year: '2023', data: [0, 0, 0, 12.34] });
    // Spans start year .. current year, padding empty years with zeros.
    const currentYear = new Date().getFullYear();
    expect(result).toHaveLength(currentYear - 2023 + 1);
    expect(result[result.length - 1].year).toBe(currentYear.toString());
    expect(result[1]).toEqual({ year: '2024', data: [0, 0, 0, 0] });
  });
});

describe('getDividendTtmPerQuarter', () => {
  it('sums each quarter with the preceding three (trailing twelve months)', () => {
    const input = {
      yearQuarters: [
        { year: '2023', quarter: 0 },
        { year: '2023', quarter: 1 },
        { year: '2023', quarter: 2 },
        { year: '2023', quarter: 3 },
        { year: '2024', quarter: 0 },
      ],
      dividends: [1, 2, 3, 4, 5],
    };

    expect(getDividendTtmPerQuarter(input).dividends).toEqual([1, 3, 6, 10, 14]);
    // year/quarter labels pass through unchanged
    expect(getDividendTtmPerQuarter(input).yearQuarters).toEqual(
      input.yearQuarters
    );
  });
});

describe('getYieldPerYear', () => {
  it('computes per-year profit and yield at each year-end and the final day', () => {
    const dates = [
      new Date(2023, 11, 30),
      new Date(2023, 11, 31), // year-end snapshot
      new Date(2024, 0, 1), // final day
    ];
    const portfolioValues = [100, 100, 200];
    const profitValues = [10, 20, 50];

    expect(getYieldPerYear(dates, portfolioValues, profitValues)).toEqual({
      years: ['2023', '2024'],
      profit: [20, 30], // 20-0, then 50-20
      yields: [20, 15], // 100*20/100, then 100*30/200
    });
  });
});

describe('transactionsDboToTransactions', () => {
  it('converts string dates to Date objects and sorts each list ascending', () => {
    const input: TransactionsDbo = {
      stock: [dbo('2023-03-01', 1, 100), dbo('2023-01-01', 2, 200)],
      dividend: [],
      commission: [],
    };

    const result = transactionsDboToTransactions(input);
    expect(result.stock.map((t) => t.date)).toEqual([
      new Date('2023-01-01'),
      new Date('2023-03-01'),
    ]);
    expect(result.stock[0]).toEqual({
      ticker: 'VUSA.AS',
      type: 'stock',
      date: new Date('2023-01-01'),
      amount: 2,
      value: 200,
      currency: 'EUR',
    });
  });
});

describe('sortTransactions', () => {
  it('orders transactions by date ascending', () => {
    const a = tx(new Date(2023, 2, 1), 1, 1);
    const b = tx(new Date(2023, 0, 1), 1, 1);
    const c = tx(new Date(2023, 1, 1), 1, 1);
    expect(sortTransactions([a, b, c])).toEqual([b, c, a]);
  });
});

describe('transactionsDboToStocks / getStartDate / getCurrencies', () => {
  const input: TransactionsDbo = {
    stock: [dbo('2023-05-10', 1, 100, 'stock', 'USD'), dbo('2023-01-15', 2, 200, 'stock', 'USD')],
    dividend: [],
    commission: [],
  };

  it('groups transactions by ticker and resolves the currency', () => {
    const stocks = transactionsDboToStocks(input);
    expect(Object.keys(stocks)).toEqual(['VUSA.AS']);
    expect(stocks['VUSA.AS'].transactions.stock).toHaveLength(2);
    expect(stocks['VUSA.AS'].currency).toEqual({ value: 'USD' });
  });

  it('getStartDate returns the earliest transaction date across stocks', () => {
    const stocks = transactionsDboToStocks(input);
    expect(getStartDate(stocks).getTime()).toBe(
      new Date('2023-01-15').getTime()
    );
  });

  it('getCurrencies returns EUR=X for a USD stock (only EUR display needs conversion)', () => {
    const stocks = transactionsDboToStocks(input); // USD stock
    // EUR display: USD→EUR via EUR=X. USD display: no conversion needed.
    expect(getCurrencies(stocks)).toEqual(['EUR=X']);
  });

  it('getCurrencies returns EURUSD=X for a EUR stock (only USD display needs conversion)', () => {
    const eurInput: TransactionsDbo = {
      stock: [dbo('2023-01-10', 1, 100, 'stock', 'EUR')],
      dividend: [],
      commission: [],
    };
    const stocks = transactionsDboToStocks(eurInput);
    // EUR display: no conversion. USD display: EUR→USD via EURUSD=X.
    expect(getCurrencies(stocks)).toEqual(['EURUSD=X']);
  });

  it('resolves GBP to { value: "GBP" } and returns both GBP FX tickers', () => {
    const gbpInput: TransactionsDbo = {
      stock: [dbo('2023-01-10', 10, 100, 'stock', 'GBP')],
      dividend: [],
      commission: [],
    };
    const stocks = transactionsDboToStocks(gbpInput);
    expect(stocks['VUSA.AS'].currency).toEqual({ value: 'GBP' });
    // EUR display: GBPEUR=X. USD display: GBPUSD=X.
    expect(getCurrencies(stocks)).toEqual(expect.arrayContaining(['GBPEUR=X', 'GBPUSD=X']));
    expect(getCurrencies(stocks)).toHaveLength(2);
  });

  it('resolves GBp (pence) to { value: "GBp" }', () => {
    const gbpInput: TransactionsDbo = {
      stock: [dbo('2023-01-10', 1000, 5000, 'stock', 'GBp')],
      dividend: [],
      commission: [],
    };
    const stocks = transactionsDboToStocks(gbpInput);
    expect(stocks['VUSA.AS'].currency).toEqual({ value: 'GBp' });
  });

  it('getCurrencies deduplicates GBP and GBp — both use the same base FX tickers', () => {
    const mixed: TransactionsDbo = {
      stock: [
        dbo('2023-01-10', 1, 100, 'stock', 'GBP'),
        { ticker: 'LLOY.L', type: 'stock', date: '2023-01-11', amount: 100, value: 5000, currency: 'GBp' },
      ],
      dividend: [],
      commission: [],
    };
    const stocks = transactionsDboToStocks(mixed);
    // GBP and GBp share the same FX ticker base — deduplicated to just 2.
    expect(getCurrencies(stocks)).toEqual(expect.arrayContaining(['GBPEUR=X', 'GBPUSD=X']));
    expect(getCurrencies(stocks)).toHaveLength(2);
  });
});

describe('yahooObjectToTicker', () => {
  it('maps a Yahoo chart response into a Ticker (nulls -> NaN, dividends extracted)', () => {
    const ts1 = 1696550400; // 2023-10-06 UTC
    const ts2 = 1696636800; // 2023-10-07 UTC
    const yahooObject: YahooObject = {
      symbol: 'VUSA.AS',
      data: {
        chart: {
          result: [
            {
              events: {
                dividends: { '1696550400': { amount: 1.5, date: ts1 } },
              },
              meta: { currency: 'EUR', symbol: 'VUSA.AS' },
              timestamp: [ts1, ts2],
              indicators: {
                quote: [
                  {
                    low: [99, 100],
                    high: [101, 112],
                    volume: [10, 20],
                    close: [100, null as unknown as number],
                    open: [100, 110],
                  },
                ],
                adjclose: [{ adjclose: [100, 110] }],
              },
            },
          ],
        },
      },
    };

    const expected: Ticker = {
      name: 'VUSA.AS',
      currency: 'EUR',
      values: [100, NaN], // null close becomes NaN
      dates: [new Date(ts1 * 1000), new Date(ts2 * 1000)],
      dividends: [{ date: new Date(ts1 * 1000), amountPerShare: 1.5 }],
    };
    expect(yahooObjectToTicker(yahooObject)).toEqual(expected);
  });
});
