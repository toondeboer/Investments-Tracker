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
  getCurrencySymbol,
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
  timeWeightedReturn,
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
  it('returns the last present value and its index', () => {
    expect(getMostRecentValueFromList([1, 2, 3])).toEqual({ value: 3, index: 2 });
  });

  it('skips trailing NaN/missing placeholders', () => {
    expect(getMostRecentValueFromList([5, NaN, NaN])).toEqual({
      value: 5,
      index: 0,
    });
  });

  it('treats a legitimate trailing 0 as a real value (e.g. sold-out position)', () => {
    // A 0 is NOT a gap — a fully-sold position has 0 shares now and must not
    // walk back to the stale earlier count.
    expect(getMostRecentValueFromList([1, 2, 0])).toEqual({ value: 0, index: 2 });
    expect(getMostRecentValueFromList([0, 0, 0])).toEqual({ value: 0, index: 2 });
    // ...but a 0 BEHIND a NaN still skips the NaN to reach the 0.
    expect(getMostRecentValueFromList([3, 0, NaN])).toEqual({ value: 0, index: 1 });
  });

  it('returns { value: 0, index: -1 } when there is no present value', () => {
    expect(getMostRecentValueFromList([])).toEqual({ value: 0, index: -1 });
    expect(getMostRecentValueFromList([NaN, NaN])).toEqual({ value: 0, index: -1 });
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

describe('timeWeightedReturn', () => {
  it('measures plain growth with no cash flows', () => {
    expect(timeWeightedReturn([100, 110], [100, 100])).toBeCloseTo(0.1, 10);
  });

  it('measures a loss', () => {
    expect(timeWeightedReturn([100, 80], [100, 100])).toBeCloseTo(-0.2, 10);
  });

  it('returns 0 for empty / single-point / no-capital series', () => {
    expect(timeWeightedReturn([], [])).toBe(0);
    expect(timeWeightedReturn([100], [100])).toBe(0);
    expect(timeWeightedReturn([0, 0, 0], [0, 0, 0])).toBe(0);
  });

  it('treats establishing a position (Vprev=0) as a deposit, not a return', () => {
    // 0 -> bought 100 -> grew to 110: only the +10% growth counts.
    expect(timeWeightedReturn([0, 100, 110], [0, 100, 100])).toBeCloseTo(0.1, 10);
  });

  it('captures a full buy -> grow -> sell-all at a gain (and ignores later zero days)', () => {
    // buy 100, value rises to 120, sell everything for 120, then nothing.
    // invested: 100 (buy) then 100-120 = -20 after the sale.
    const values = [0, 100, 120, 0, 0];
    const invested = [0, 100, 100, -20, -20];
    expect(timeWeightedReturn(values, invested)).toBeCloseTo(0.2, 10);
  });

  it('captures a realized gain when the sale price exceeds the last valuation', () => {
    // last marked value 100, but sold for 120 -> +20% realized in the sale period.
    expect(timeWeightedReturn([100, 0], [100, -20])).toBeCloseTo(0.2, 10);
  });

  it('stays finite around a missing (NaN) price instead of poisoning the chain', () => {
    // The NaN day drops the two sub-periods touching it; the +10% legs on either
    // side still compound to a finite 1.1 * 1.1 - 1 = +21%.
    expect(timeWeightedReturn([100, 110, NaN, 121, 133.1], [100, 100, 100, 100, 100])).toBeCloseTo(0.21, 10);
  });
});

describe('getReturn', () => {
  const profit = [100, 110, 130];

  it('absolute is the profit change over the window; % is over gross invested', () => {
    const r = getReturn(profit, 1000, 1);
    expect(r.absolute).toBe(30); // 130 (index 2) - 100 (index 0)
    expect(r.percentage).toBeCloseTo(3, 10); // 30 / 1000 * 100
  });

  it('uses a baseline of 0 when the window reaches before the first point', () => {
    const r = getReturn(profit, 1000, 5); // startIndex clamps to 0 -> baseline 0
    expect(r.absolute).toBe(130);
    expect(r.percentage).toBeCloseTo(13, 10); // 130 / 1000 * 100
  });

  it('returns 0% (not NaN) when gross invested is 0', () => {
    expect(getReturn([5, 10], 0, 1)).toEqual({ absolute: 10, percentage: 0 });
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
  it('ignores the time component within the same UTC day', () => {
    expect(
      isSameDay(
        new Date('2023-01-02T09:30:00.000Z'),
        new Date('2023-01-02T23:59:00.000Z')
      )
    ).toBe(true);
    expect(
      isSameDay(
        new Date('2023-01-02T00:00:00.000Z'),
        new Date('2023-01-03T00:00:00.000Z')
      )
    ).toBe(false);
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

  it('values a 0-share (sold-out) day at 0 even with a missing or absent price', () => {
    const dates = [
      new Date('2023-01-02T00:00:00.000Z'),
      new Date('2023-01-03T00:00:00.000Z'), // no ticker entry (gap)
      new Date('2023-01-04T00:00:00.000Z'), // ticker entry but NaN close
    ];
    const aggregatedAmounts = [0, 0, 0]; // fully sold throughout
    const ticker: Ticker = {
      name: 'X',
      currency: 'EUR',
      dates: [new Date('2023-01-02T00:00:00.000Z'), new Date('2023-01-04T00:00:00.000Z')],
      values: [100, NaN],
      dividends: [],
    };
    // No NaN must leak in: holding nothing is worth 0 on every day.
    expect(getPortfolioValues(dates, aggregatedAmounts, ticker)).toEqual([0, 0, 0]);
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
  it('computes a time-weighted return per year, chaining across the year boundary', () => {
    const dates = [
      new Date(Date.UTC(2023, 11, 30)),
      new Date(Date.UTC(2023, 11, 31)), // 2023 year-end
      new Date(Date.UTC(2024, 11, 31)), // 2024 year-end (final point)
    ];
    // No cash flows: value 100 -> 120 in 2023, then 120 -> 240 in 2024.
    const portfolioValues = [100, 120, 240];
    const invested = [100, 100, 100];
    const profitValues = [0, 20, 140];

    const result = getYieldPerYear(dates, portfolioValues, invested, profitValues);
    expect(result.years).toEqual(['2023', '2024']);
    expect(result.profit).toEqual([20, 120]); // 20-0, then 140-20
    expect(result.yields[0]).toBeCloseTo(20, 10); // 120/100 - 1
    expect(result.yields[1]).toBeCloseTo(100, 10); // 240/120 - 1
  });

  it('gives a sane, finite yield for a year fully bought and sold (regression)', () => {
    const dates = [
      new Date(Date.UTC(2023, 5, 30)),
      new Date(Date.UTC(2023, 8, 30)),
      new Date(Date.UTC(2023, 11, 31)), // 2023 year-end — position closed by now
      new Date(Date.UTC(2024, 11, 31)), // 2024 year-end — never held anything
    ];
    // Buy 100, grow to 150, sell everything for 150 (invested 100 -> -50).
    const portfolioValues = [100, 150, 0, 0];
    const invested = [100, 100, -50, -50];
    const profitValues = [0, 50, 50, 50];

    const result = getYieldPerYear(dates, portfolioValues, invested, profitValues);
    expect(result.years).toEqual(['2023', '2024']);
    expect(result.yields[0]).toBeCloseTo(50, 10); // realized +50%, not a blow-up
    expect(result.yields[1]).toBe(0); // no holdings in 2024
    expect(result.profit).toEqual([50, 0]);
    result.yields.forEach((y) => expect(Number.isFinite(y)).toBe(true));
  });

  it('returns 0% yield (not Infinity/NaN) when the portfolio value is 0', () => {
    const dates = [new Date(Date.UTC(2023, 11, 31)), new Date(Date.UTC(2024, 11, 31))];
    const portfolioValues = [0, 0];
    const invested = [0, 0];
    const profitValues = [10, 20];

    const result = getYieldPerYear(dates, portfolioValues, invested, profitValues);
    expect(result.yields).toEqual([0, 0]);
    result.yields.forEach((y) => expect(Number.isFinite(y)).toBe(true));
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

describe('getCurrencySymbol', () => {
  it('maps USD to $ and falls back to € otherwise', () => {
    expect(getCurrencySymbol('USD')).toBe('$');
    expect(getCurrencySymbol('EUR')).toBe('€');
    expect(getCurrencySymbol(undefined)).toBe('€');
    expect(getCurrencySymbol(null)).toBe('€');
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

  it('trims to the shorter array when timestamps and closes differ in length', () => {
    const ts1 = 1696550400;
    const ts2 = 1696636800;
    const yahooObject: YahooObject = {
      symbol: 'AAPL',
      data: {
        chart: {
          result: [
            {
              meta: { currency: 'USD', symbol: 'AAPL' },
              timestamp: [ts1, ts2], // 2 timestamps
              indicators: { quote: [{ close: [150 ] } as any] }, // only 1 close
            } as any,
          ],
        },
      },
    };

    const result = yahooObjectToTicker(yahooObject);
    // Aligned to the shorter length (1) so dates[i] always matches values[i].
    expect(result.values).toEqual([150]);
    expect(result.dates).toEqual([new Date(ts1 * 1000)]);
  });
});
