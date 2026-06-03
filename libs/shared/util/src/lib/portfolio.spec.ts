import { Ticker, TransactionsDbo } from './types';
import { getDailyDates, getStartDate, transactionsDboToStocks } from './util';
import { computeAllPortfolios, computePortfolioState, computePortfolioStateSafe } from './portfolio';
import { PortfolioDbo } from './types';

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

  it('does not double-count a transaction landing on the range-window boundary', () => {
    // Regression: getDailyDates starts one day before the range start, so the
    // pre-range snapshot must exclude that first chart day. A buy/commission on
    // exactly (rangeStart - 1) must not be counted both in the baseline and the
    // window, which previously made summary totals depend on the selected range.
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2024-06-03T12:00:00.000Z'));
    try {
      // For '3M' at this clock, rangeStart = 2024-03-03 and dates[0] = 2024-03-02.
      const dbo: TransactionsDbo = {
        stock: [
          { ticker: 'VUSA.AS', type: 'stock', date: '2023-01-10', amount: 10, value: 1000, currency: 'EUR' },
          { ticker: 'VUSA.AS', type: 'stock', date: '2024-03-02', amount: 1, value: 120, currency: 'EUR' },
        ],
        dividend: [],
        commission: [
          { ticker: 'VUSA.AS', type: 'commission', date: '2024-03-02', amount: 0, value: 7, currency: 'EUR' },
        ],
      };
      const dates = getDailyDates(getStartDate(transactionsDboToStocks(dbo)), new Date());
      const tickers = {
        'VUSA.AS': { name: 'VUSA.AS', currency: 'EUR', dates, values: dates.map(() => 150), dividends: [] } as Ticker,
      };

      const all = computePortfolioState(dbo, tickers, undefined, 'ALL').summary;
      const m3 = computePortfolioState(dbo, tickers, undefined, '3M').summary;

      // 11 shares * 150 = 1650; commission 7; invested 1120 — in every range.
      expect(all.totalCommission).toBeCloseTo(7);
      expect(m3.totalCommission).toBeCloseTo(7);
      expect(m3.totalInvested).toBeCloseTo(all.totalInvested);
      expect(m3.portfolioValue).toBeCloseTo(all.portfolioValue);
    } finally {
      jest.useRealTimers();
    }
  });

  it('computes realized profit correctly after a position is fully sold', () => {
    // Buy 10 @ €100 (cost €1000), later sell all 10 @ €120 (proceeds €1200,
    // recorded with a negative value per the signed convention), €5 commission.
    // Fully sold -> 0 shares, €0 market value. Total return (simple formula,
    // commission excluded) = proceeds 1200 - cost 1000 = 200; the profit chart
    // (which nets out commission) shows 1200-1000-5 = 195.
    const dbo: TransactionsDbo = {
      stock: [
        { ticker: 'VUSA.AS', type: 'stock', date: '2023-01-10', amount: 10, value: 1000, currency: 'EUR' },
        { ticker: 'VUSA.AS', type: 'stock', date: '2023-06-10', amount: -10, value: -1200, currency: 'EUR' },
      ],
      dividend: [],
      commission: [
        { ticker: 'VUSA.AS', type: 'commission', date: '2023-01-10', amount: 0, value: 5, currency: 'EUR' },
      ],
    };
    const dates = getDailyDates(getStartDate(transactionsDboToStocks(dbo)), new Date());
    const ticker: Ticker = {
      name: 'VUSA.AS', currency: 'EUR', dates, values: dates.map(() => 130), dividends: [],
    };

    const result = computePortfolioState(dbo, { 'VUSA.AS': ticker });
    const stock = result.stocks['VUSA.AS'];

    expect(stock.summary.amountOfShares).toBe(0);
    expect(stock.summary.portfolioValue).toBe(0);
    expect(stock.summary.totalReturn.absolute).toBeCloseTo(200);
    expect(result.summary.totalReturn.absolute).toBeCloseTo(200);

    // Profit on every sold-out day must be the realized 195 — never NaN from a
    // missing price multiplied by 0 shares.
    const lastProfit = stock.chartData.profit[stock.chartData.profit.length - 1];
    expect(Number.isFinite(lastProfit)).toBe(true);
    expect(lastProfit).toBeCloseTo(195);
  });

  it('keeps the aggregate return % sane when one position is fully sold at a large gain', () => {
    // Regression: an active position worth little, aggregated with a fully-sold
    // position carrying a large realized gain, used to divide total profit by the
    // tiny current value -> thousands of percent. Dividing by gross purchase cost
    // (which never shrinks back) fixes it.
    //
    //   ACTIVE:   buy 1 @ €100, still worth ~€100 (flat).
    //   SOLD:     buy 10 @ €100 (€1000), price rises to €500, sell all @ €500
    //             (€5000) -> realized €4000.
    // Aggregate current value ≈ €100; total profit ≈ €4000. Old %: ~4000%.
    const dbo: TransactionsDbo = {
      stock: [
        { ticker: 'ACTIVE', type: 'stock', date: '2023-01-10', amount: 1, value: 100, currency: 'EUR' },
        { ticker: 'SOLD', type: 'stock', date: '2023-01-10', amount: 10, value: 1000, currency: 'EUR' },
        { ticker: 'SOLD', type: 'stock', date: '2023-06-10', amount: -10, value: -5000, currency: 'EUR' },
      ],
      dividend: [],
      commission: [],
    };
    const dates = getDailyDates(getStartDate(transactionsDboToStocks(dbo)), new Date());
    const beforeJune = (d: Date) => d < new Date('2023-06-01T00:00:00.000Z');
    const tickers = {
      ACTIVE: { name: 'ACTIVE', currency: 'EUR', dates, values: dates.map(() => 100), dividends: [] } as Ticker,
      // Price rises 100 -> 500 before the June sale, so the gain is a real market move.
      SOLD: { name: 'SOLD', currency: 'EUR', dates, values: dates.map((d) => (beforeJune(d) ? 100 : 500)), dividends: [] } as Ticker,
    };

    const summary = computePortfolioState(dbo, tickers).summary;

    expect(summary.portfolioValue).toBeCloseTo(100); // only the active position has value
    expect(summary.totalReturn.absolute).toBeCloseTo(4000);
    // Return on gross invested capital: profit 4000 / (100 + 1000) invested.
    // Finite and reconciles with the euro profit — not the old ~4000% blow-up
    // from dividing by the tiny remaining current value.
    expect(Number.isFinite(summary.totalReturn.percentage)).toBe(true);
    expect(summary.totalReturn.percentage).toBeCloseTo((4000 / 1100) * 100, 6);
  });

  it('keeps aggregate weekly/monthly returns sane across mixed market-calendar gaps (regression)', () => {
    // Two stocks held throughout, no trades in the window, gently rising price,
    // but on DIFFERENT market calendars (one closed Mondays, one Tuesdays). On a
    // day one ticker is closed and the other isn't, the aggregate must carry the
    // closed stock's last value forward — not drop it to 0, which used to send
    // the windowed (1W/1M) return to absurd values (e.g. 1525%/-100%).
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-06-01T12:00:00.000Z'));
    try {
      const dbo: TransactionsDbo = {
        stock: [
          { ticker: 'AAA', type: 'stock', date: '2024-01-02', amount: 10, value: 1000, currency: 'EUR' },
          { ticker: 'BBB', type: 'stock', date: '2024-01-02', amount: 10, value: 1000, currency: 'EUR' },
        ],
        dividend: [],
        commission: [],
      };
      const today = new Date('2026-06-01T00:00:00.000Z');
      // Two different market calendars: AAA also closed Mondays, BBB also closed
      // Tuesdays -> on those days one ticker has a gap while the other doesn't.
      const mk = (name: string, skipDow: number): Ticker => {
        const dates: Date[] = [];
        const values: number[] = [];
        for (let i = 45; i >= 0; i--) {
          const d = new Date(today);
          d.setUTCDate(d.getUTCDate() - i);
          const dow = d.getUTCDay();
          if (dow === 0 || dow === 6 || dow === skipDow) continue;
          dates.push(d);
          values.push(100 + (45 - i) * 0.1); // gently rising
        }
        return { name, currency: 'EUR', dates, values, dividends: [] };
      };
      const summary = computePortfolioState(dbo, { AAA: mk('AAA', 1), BBB: mk('BBB', 2) }).summary;

      expect(Number.isFinite(summary.weeklyReturn.percentage)).toBe(true);
      expect(Number.isFinite(summary.monthlyReturn.percentage)).toBe(true);
      // Gently rising price -> small positive returns, never the -100% blow-up.
      expect(summary.weeklyReturn.percentage).toBeGreaterThan(0);
      expect(summary.weeklyReturn.percentage).toBeLessThan(10);
      expect(summary.monthlyReturn.percentage).toBeGreaterThan(0);
      expect(summary.monthlyReturn.percentage).toBeLessThan(10);
    } finally {
      jest.useRealTimers();
    }
  });

  it('carries the chart value across weekends on a daily range (no NaN gaps)', () => {
    // Yahoo tickers have no weekend rows, so getPortfolioValues yields NaN on
    // Sat/Sun. The daily value/profit charts must carry the last known value
    // across those days instead of dropping to the axis.
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-06-01T12:00:00.000Z'));
    try {
      const dbo: TransactionsDbo = {
        stock: [
          { ticker: 'AAA', type: 'stock', date: '2026-03-02', amount: 10, value: 1000, currency: 'EUR' },
        ],
        dividend: [],
        commission: [],
      };
      const today = new Date('2026-06-01T00:00:00.000Z');
      // Weekday-only prices (constant 100) for the last ~70 days.
      const dates: Date[] = [];
      const values: number[] = [];
      for (let i = 70; i >= 0; i--) {
        const d = new Date(today);
        d.setUTCDate(d.getUTCDate() - i);
        const dow = d.getUTCDay();
        if (dow === 0 || dow === 6) continue; // weekends absent, like Yahoo
        dates.push(d);
        values.push(100);
      }
      const ticker: Ticker = { name: 'AAA', currency: 'EUR', dates, values, dividends: [] };

      const result = computePortfolioState(dbo, { AAA: ticker }, undefined, '1M');
      const pv = result.stocks['AAA'].chartData.portfolioValues;
      const profit = result.stocks['AAA'].chartData.profit;

      // Position held throughout the window -> every charted day is the held
      // value (10 * 100), weekends included, and nothing is NaN.
      expect(pv.every(Number.isFinite)).toBe(true);
      expect(profit.every(Number.isFinite)).toBe(true);
      const weekendIdx = result.dates.findIndex(
        (d) => d.getUTCDay() === 0 || d.getUTCDay() === 6
      );
      expect(weekendIdx).toBeGreaterThan(-1);
      expect(pv[weekendIdx]).toBe(1000);
    } finally {
      jest.useRealTimers();
    }
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

    // The displayed transaction keeps its native value and gains a
    // convertedValue at the purchase-date rate (0.9): $100 -> €90.
    const tx = result.stocks['AAPL'].transactions.stock[0];
    expect(tx.value).toBe(100);
    expect(tx.currency).toBe('USD');
    expect(tx.convertedValue).toBeCloseTo(90);
  });

  it('leaves convertedValue undefined when no FX conversion is needed', () => {
    const dates = getDailyDates(getStartDate(transactionsDboToStocks(dbo)), new Date());
    const ticker: Ticker = {
      name: 'VUSA.AS', currency: 'EUR', dates, values: dates.map(() => 150), dividends: [],
    };
    const result = computePortfolioState(dbo, { 'VUSA.AS': ticker }, 'EUR');
    expect(result.stocks['VUSA.AS'].transactions.stock[0].convertedValue).toBeUndefined();
  });

  it('fills the dividend list from Yahoo when the holding has no CSV dividends', () => {
    const noDivDbo: TransactionsDbo = {
      stock: [
        { ticker: 'AAPL', type: 'stock', date: '2023-01-10', amount: 10, value: 1000, currency: 'USD' },
      ],
      dividend: [],
      commission: [],
    };
    const dates = getDailyDates(getStartDate(transactionsDboToStocks(noDivDbo)), new Date());
    const ticker: Ticker = {
      name: 'AAPL',
      currency: 'USD',
      dates,
      values: dates.map(() => 200),
      dividends: [{ date: new Date('2023-03-01'), amountPerShare: 0.5 }],
    };

    const result = computePortfolioState(noDivDbo, { AAPL: ticker }, 'USD');
    const divs = result.stocks['AAPL'].transactions.dividend;

    // No CSV dividends, so the Yahoo dividend event is surfaced: 10 shares * $0.5.
    expect(divs).toHaveLength(1);
    expect(divs[0].value).toBeCloseTo(5);
    expect(divs[0].currency).toBe('USD');
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
    // Total return captures both the price move and the FX move: 200 - 80 = 120
    // (the simple formula does not net out commission).
    expect(s.totalReturn.absolute).toBeCloseTo(120);
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

describe('computePortfolioStateSafe', () => {
  const usdDbo: TransactionsDbo = {
    stock: [{ ticker: 'AAPL', type: 'stock', date: '2023-01-10', amount: 1, value: 100, currency: 'USD' }],
    dividend: [],
    commission: [],
  };

  function usdTicker(): Ticker {
    const dates = getDailyDates(getStartDate(transactionsDboToStocks(usdDbo)), new Date());
    return { name: 'AAPL', currency: 'USD', dates, values: dates.map(() => 200), dividends: [] };
  }

  it('returns fxError and a native fallback when FX data is missing', () => {
    const emptyFx: Ticker = { name: 'EUR=X', currency: 'EUR', dates: [], values: [], dividends: [] };

    const { portfolio, fxError } = computePortfolioStateSafe(
      usdDbo,
      { AAPL: usdTicker(), 'EUR=X': emptyFx },
      'EUR'
    );

    expect(fxError).toContain('No FX rate data available');
    // Fallback computes without conversion: 1 * $200 unconverted = 200.
    expect(portfolio.summary.portfolioValue).toBeCloseTo(200);
  });

  it('returns null fxError when conversion succeeds', () => {
    const dates = usdTicker().dates;
    const fx: Ticker = { name: 'EUR=X', currency: 'EUR', dates, values: dates.map(() => 0.9), dividends: [] };

    const { fxError } = computePortfolioStateSafe(usdDbo, { AAPL: usdTicker(), 'EUR=X': fx }, 'EUR');
    expect(fxError).toBeNull();
  });
});

describe('computeAllPortfolios FX isolation', () => {
  it('a missing FX rate in one portfolio does not strip FX from the others', () => {
    const dates = getDailyDates(new Date('2023-01-09T00:00:00.000Z'), new Date());
    const aapl: Ticker = { name: 'AAPL', currency: 'USD', dates, values: dates.map(() => 200), dividends: [] };
    const eurx: Ticker = { name: 'EUR=X', currency: 'EUR', dates, values: dates.map(() => 0.9), dividends: [] };

    const portfolios: PortfolioDbo[] = [
      {
        id: 'good',
        name: 'Good',
        transactions: {
          stock: [{ ticker: 'AAPL', type: 'stock', date: '2023-01-10', amount: 1, value: 100, currency: 'USD' }],
          dividend: [],
          commission: [],
        },
      },
      {
        id: 'bad',
        name: 'Bad (FX missing)',
        transactions: {
          // GBP needs GBPEUR=X which is absent -> this portfolio falls back to native.
          stock: [{ ticker: 'BP.L', type: 'stock', date: '2023-01-10', amount: 10, value: 500, currency: 'GBP' }],
          dividend: [],
          commission: [],
        },
      },
    ];

    // BP.L price ticker present but no GBPEUR=X, so 'bad' can't convert.
    const bpl: Ticker = { name: 'BP.L', currency: 'GBP', dates, values: dates.map(() => 60), dividends: [] };
    const result = computeAllPortfolios(portfolios, { AAPL: aapl, 'EUR=X': eurx, 'BP.L': bpl }, 'EUR', '1Y');

    // 'good' is still FX-converted: 1 * $200 * 0.9 = €180.
    expect(result['good'].summary.portfolioValue).toBeCloseTo(180);
    // 'bad' falls back to native (no GBPEUR=X): 10 * £60 = 600 unconverted.
    expect(result['bad'].summary.portfolioValue).toBeCloseTo(600);
  });
});
