import { Ticker, TransactionsDbo } from './types';
import { getDailyDates, getStartDate, transactionsDboToStocks } from './util';
import { computePortfolioState } from './portfolio';

describe('computePortfolioState', () => {
  const dbo: TransactionsDbo = {
    stock: [
      {
        ticker: 'VUSA.AS',
        type: 'stock',
        date: '2023-01-10',
        amount: 2,
        value: 200,
        currency: 'EUR',
      },
    ],
    dividend: [
      {
        ticker: 'VUSA.AS',
        type: 'dividend',
        date: '2023-02-10',
        amount: 1,
        value: 5,
        currency: 'EUR',
      },
    ],
    commission: [
      {
        ticker: 'VUSA.AS',
        type: 'commission',
        date: '2023-01-10',
        amount: 1,
        value: 3,
        currency: 'EUR',
      },
    ],
  };

  it('derives transaction data (no prices yet)', () => {
    const result = computePortfolioState(dbo, {});

    expect(Object.keys(result.stocks)).toEqual(['VUSA.AS']);
    expect(result.transactions.stock).toHaveLength(1);
    expect(result.dates.length).toBeGreaterThan(0);

    // Aggregated, carried-forward totals.
    expect(result.summary.totalInvested).toBe(200);
    expect(result.summary.totalDividend).toBe(5);
    expect(result.summary.totalCommission).toBe(3);

    const stock = result.stocks['VUSA.AS'];
    expect(stock.summary.amountOfShares).toBe(2);
    expect(stock.summary.averageSharePrice).toBe(100); // 200 / 2

    // No tickers -> no price-derived values.
    expect(result.summary.portfolioValue).toBe(0);
    expect(stock.chartData.portfolioValues).toEqual([]);
  });

  it('adds price-derived data once tickers are present', () => {
    // Build a ticker whose dates line up exactly with the computed daily dates
    // and a flat price of 150, so values are deterministic regardless of range.
    const dates = getDailyDates(
      getStartDate(transactionsDboToStocks(dbo)),
      new Date()
    );
    const ticker: Ticker = {
      name: 'VUSA.AS',
      currency: 'EUR',
      dates,
      values: dates.map(() => 150),
      dividends: [],
    };

    const result = computePortfolioState(dbo, { 'VUSA.AS': ticker });
    const stock = result.stocks['VUSA.AS'];

    // 2 shares * 150 at the most recent day.
    expect(result.summary.portfolioValue).toBe(300);
    expect(stock.summary.portfolioValue).toBe(300);
    expect(stock.summary.currentSharePrice).toBe(150);

    // Stage-1 totals are preserved through stage 2.
    expect(stock.summary.totalInvested).toBe(200);
    // portfolioValues must always be aligned with the dates array returned.
    expect(stock.chartData.portfolioValues).toHaveLength(result.dates.length);
  });

  it('reports 0 shares and 0 value after a position is fully sold', () => {
    // Buy 2, later sell 2 -> 0 shares now. The most-recent share count and
    // portfolio value must be 0, not the stale pre-sale numbers.
    const soldDbo: TransactionsDbo = {
      stock: [
        { ticker: 'VUSA.AS', type: 'stock', date: '2023-01-10', amount: 2, value: 200, currency: 'EUR' },
        { ticker: 'VUSA.AS', type: 'stock', date: '2023-06-10', amount: -2, value: -260, currency: 'EUR' },
      ],
      dividend: [],
      commission: [],
    };

    const dates = getDailyDates(getStartDate(transactionsDboToStocks(soldDbo)), new Date());
    const ticker: Ticker = {
      name: 'VUSA.AS',
      currency: 'EUR',
      dates,
      values: dates.map(() => 150),
      dividends: [],
    };

    const result = computePortfolioState(soldDbo, { 'VUSA.AS': ticker });
    const stock = result.stocks['VUSA.AS'];

    expect(stock.summary.amountOfShares).toBe(0);
    expect(stock.summary.portfolioValue).toBe(0);
    expect(result.summary.portfolioValue).toBe(0);
  });

  it('returns an empty portfolio for no transactions', () => {
    const result = computePortfolioState(
      { stock: [], dividend: [], commission: [] },
      {}
    );

    expect(result.stocks).toEqual({});
    expect(result.dates).toEqual([]);
    expect(result.currencies).toEqual([]);
    expect(result.summary.totalInvested).toBe(0);
    expect(result.summary.portfolioValue).toBe(0);
  });

  it('applies FX conversion when displayCurrency differs from stock currency', () => {
    const usdDbo: TransactionsDbo = {
      stock: [
        {
          ticker: 'AAPL',
          type: 'stock',
          date: '2023-01-10',
          amount: 1,
          value: 100,
          currency: 'USD',
        },
      ],
      dividend: [],
      commission: [],
    };

    const dates = getDailyDates(
      getStartDate(transactionsDboToStocks(usdDbo)),
      new Date()
    );

    const stockTicker: Ticker = {
      name: 'AAPL',
      currency: 'USD',
      dates,
      values: dates.map(() => 200),
      dividends: [],
    };

    // EUR=X represents the USD→EUR conversion rate. A rate of 0.9 means
    // 1 USD = 0.9 EUR, so a $200 position becomes €180.
    const fxTicker: Ticker = {
      name: 'EUR=X',
      currency: 'EUR',
      dates,
      values: dates.map(() => 0.9),
      dividends: [],
    };

    const result = computePortfolioState(
      usdDbo,
      { AAPL: stockTicker, 'EUR=X': fxTicker },
      'EUR'
    );

    // 1 share * $200 * 0.9 fx = €180
    expect(result.summary.portfolioValue).toBeCloseTo(180);
    expect(result.stocks['AAPL'].summary.portfolioValue).toBeCloseTo(180);
    expect(result.stocks['AAPL'].summary.currentSharePrice).toBeCloseTo(180);
  });

  it('locks cost basis at the purchase-date FX rate (spot-at-purchase)', () => {
    const usdDbo: TransactionsDbo = {
      stock: [
        { ticker: 'AAPL', type: 'stock', date: '2023-01-10', amount: 1, value: 100, currency: 'USD' },
      ],
      dividend: [],
      commission: [
        { ticker: 'AAPL', type: 'commission', date: '2023-01-10', amount: 0, value: 10, currency: 'USD' },
      ],
    };

    const dates = getDailyDates(getStartDate(transactionsDboToStocks(usdDbo)), new Date());
    const stockTicker: Ticker = {
      name: 'AAPL', currency: 'USD', dates, values: dates.map(() => 200), dividends: [],
    };
    // FX rate was 0.8 at purchase (first 5 days) and 1.0 now (rest).
    const fxTicker: Ticker = {
      name: 'EUR=X', currency: 'EUR', dates,
      values: dates.map((_, i) => (i < 5 ? 0.8 : 1.0)),
      dividends: [],
    };

    const result = computePortfolioState(usdDbo, { AAPL: stockTicker, 'EUR=X': fxTicker }, 'EUR');
    const s = result.stocks['AAPL'].summary;

    // Market value uses today's spot (1.0): 1 * $200 * 1.0 = €200.
    expect(s.portfolioValue).toBeCloseTo(200);
    // Cost basis is frozen at the purchase-date rate (0.8), NOT today's:
    //   invested  = $100 * 0.8 = €80   (would be €100 under per-date spot)
    //   commission= $10  * 0.8 = €8
    expect(s.totalInvested).toBeCloseTo(80);
    expect(s.totalCommission).toBeCloseTo(8);
    // Total return captures both the price move and the FX move: 200 - 80 - 8 = 112.
    expect(s.totalReturn.absolute).toBeCloseTo(112);
  });

  it('skips FX conversion when displayCurrency matches stock currency', () => {
    const eurDbo: TransactionsDbo = {
      stock: [
        {
          ticker: 'VUSA.AS',
          type: 'stock',
          date: '2023-01-10',
          amount: 2,
          value: 200,
          currency: 'EUR',
        },
      ],
      dividend: [],
      commission: [],
    };

    const dates = getDailyDates(
      getStartDate(transactionsDboToStocks(eurDbo)),
      new Date()
    );

    const stockTicker: Ticker = {
      name: 'VUSA.AS',
      currency: 'EUR',
      dates,
      values: dates.map(() => 150),
      dividends: [],
    };

    const result = computePortfolioState(
      eurDbo,
      { 'VUSA.AS': stockTicker },
      'EUR'
    );

    // No FX applied: 2 shares * €150 = €300
    expect(result.summary.portfolioValue).toBe(300);
  });

  it('backward-fills FX rate for portfolio dates before the first FX data point', () => {
    const usdDbo: TransactionsDbo = {
      stock: [
        {
          ticker: 'AAPL',
          type: 'stock',
          date: '2023-01-10',
          amount: 1,
          value: 100,
          currency: 'USD',
        },
      ],
      dividend: [],
      commission: [],
    };

    const dates = getDailyDates(
      getStartDate(transactionsDboToStocks(usdDbo)),
      new Date()
    );

    const stockTicker: Ticker = {
      name: 'AAPL',
      currency: 'USD',
      dates,
      values: dates.map(() => 200),
      dividends: [],
    };

    // FX data starts 5 days after the portfolio start: the first 5 dates should
    // still get the same rate via the backward fill.
    const fxStartOffset = 5;
    const fxTicker: Ticker = {
      name: 'EUR=X',
      currency: 'EUR',
      dates: dates.slice(fxStartOffset),
      values: dates.slice(fxStartOffset).map(() => 0.9),
      dividends: [],
    };

    const result = computePortfolioState(
      usdDbo,
      { AAPL: stockTicker, 'EUR=X': fxTicker },
      'EUR'
    );

    // All portfolio values should use rate 0.9 — backward fill covers the gap.
    expect(result.summary.portfolioValue).toBeCloseTo(180);
    const portfolioValues = result.stocks['AAPL'].chartData.portfolioValues;
    // dates[0] is one day before the transaction (0 shares); dates[1] is when
    // the 1-share transaction lands. getDailyDates starts one day before start.
    expect(portfolioValues[1]).toBeCloseTo(200 * 0.9);
  });

  it('throws when FX ticker has no valid data', () => {
    const usdDbo: TransactionsDbo = {
      stock: [
        {
          ticker: 'AAPL',
          type: 'stock',
          date: '2023-01-10',
          amount: 1,
          value: 100,
          currency: 'USD',
        },
      ],
      dividend: [],
      commission: [],
    };

    const dates = getDailyDates(
      getStartDate(transactionsDboToStocks(usdDbo)),
      new Date()
    );

    const stockTicker: Ticker = {
      name: 'AAPL',
      currency: 'USD',
      dates,
      values: dates.map(() => 200),
      dividends: [],
    };

    const emptyFxTicker: Ticker = {
      name: 'EUR=X',
      currency: 'EUR',
      dates: [],
      values: [],
      dividends: [],
    };

    expect(() =>
      computePortfolioState(
        usdDbo,
        { AAPL: stockTicker, 'EUR=X': emptyFxTicker },
        'EUR'
      )
    ).toThrow('No FX rate data available for EUR=X');
  });

  it('converts EUR stock to USD display using EURUSD=X', () => {
    const eurDbo: TransactionsDbo = {
      stock: [
        {
          ticker: 'VUSA.AS',
          type: 'stock',
          date: '2023-01-10',
          amount: 1,
          value: 100,
          currency: 'EUR',
        },
      ],
      dividend: [],
      commission: [],
    };

    const dates = getDailyDates(
      getStartDate(transactionsDboToStocks(eurDbo)),
      new Date()
    );

    const stockTicker: Ticker = {
      name: 'VUSA.AS',
      currency: 'EUR',
      dates,
      values: dates.map(() => 150),
      dividends: [],
    };

    // EURUSD=X: 1 EUR = 1.1 USD
    const fxTicker: Ticker = {
      name: 'EURUSD=X',
      currency: 'USD',
      dates,
      values: dates.map(() => 1.1),
      dividends: [],
    };

    const result = computePortfolioState(
      eurDbo,
      { 'VUSA.AS': stockTicker, 'EURUSD=X': fxTicker },
      'USD'
    );

    // 1 share * €150 * 1.1 EURUSD = $165
    expect(result.summary.portfolioValue).toBeCloseTo(165);
    expect(result.stocks['VUSA.AS'].summary.currentSharePrice).toBeCloseTo(165);
  });

  it('converts GBP stock to USD display using GBPUSD=X', () => {
    const gbpDbo: TransactionsDbo = {
      stock: [
        {
          ticker: 'BP.L',
          type: 'stock',
          date: '2023-01-10',
          amount: 10,
          value: 500,
          currency: 'GBP',
        },
      ],
      dividend: [],
      commission: [],
    };

    const dates = getDailyDates(
      getStartDate(transactionsDboToStocks(gbpDbo)),
      new Date()
    );

    const stockTicker: Ticker = {
      name: 'BP.L',
      currency: 'GBP',
      dates,
      values: dates.map(() => 60),
      dividends: [],
    };

    // GBPUSD=X: 1 GBP = 1.25 USD
    const fxTicker: Ticker = {
      name: 'GBPUSD=X',
      currency: 'USD',
      dates,
      values: dates.map(() => 1.25),
      dividends: [],
    };

    const result = computePortfolioState(
      gbpDbo,
      { 'BP.L': stockTicker, 'GBPUSD=X': fxTicker },
      'USD'
    );

    // 10 shares * £60 * 1.25 GBPUSD = $750
    expect(result.summary.portfolioValue).toBeCloseTo(750);
    expect(result.stocks['BP.L'].summary.currentSharePrice).toBeCloseTo(75);
  });

  it('skips FX for USD stock when display currency is USD', () => {
    const usdDbo: TransactionsDbo = {
      stock: [
        {
          ticker: 'AAPL',
          type: 'stock',
          date: '2023-01-10',
          amount: 2,
          value: 300,
          currency: 'USD',
        },
      ],
      dividend: [],
      commission: [],
    };

    const dates = getDailyDates(
      getStartDate(transactionsDboToStocks(usdDbo)),
      new Date()
    );

    const stockTicker: Ticker = {
      name: 'AAPL',
      currency: 'USD',
      dates,
      values: dates.map(() => 200),
      dividends: [],
    };

    const result = computePortfolioState(usdDbo, { AAPL: stockTicker }, 'USD');

    // No FX applied: 2 shares * $200 = $400
    expect(result.summary.portfolioValue).toBe(400);
  });

  it('applies GBp (pence) fxMultiplier: divides by 100 before EUR conversion', () => {
    const gbpDbo: TransactionsDbo = {
      stock: [
        {
          ticker: 'LLOY.L',
          type: 'stock',
          date: '2023-01-10',
          amount: 100,
          value: 5000, // 5000 pence = £50
          currency: 'GBp',
        },
      ],
      dividend: [],
      commission: [],
    };

    const dates = getDailyDates(
      getStartDate(transactionsDboToStocks(gbpDbo)),
      new Date()
    );

    // Price in pence: 60p per share
    const stockTicker: Ticker = {
      name: 'LLOY.L',
      currency: 'GBp',
      dates,
      values: dates.map(() => 60),
      dividends: [],
    };

    // GBPEUR=X: 1 GBP = 1.15 EUR
    const fxTicker: Ticker = {
      name: 'GBPEUR=X',
      currency: 'EUR',
      dates,
      values: dates.map(() => 1.15),
      dividends: [],
    };

    const result = computePortfolioState(
      gbpDbo,
      { 'LLOY.L': stockTicker, 'GBPEUR=X': fxTicker },
      'EUR'
    );

    // 100 shares * 60p = 6000p = £60; £60 * 1.15 = €69
    expect(result.summary.portfolioValue).toBeCloseTo(69);
    expect(result.stocks['LLOY.L'].summary.portfolioValue).toBeCloseTo(69);
    // Current share price: 60p = £0.60 * 1.15 = €0.69
    expect(result.stocks['LLOY.L'].summary.currentSharePrice).toBeCloseTo(0.69);
  });
});
