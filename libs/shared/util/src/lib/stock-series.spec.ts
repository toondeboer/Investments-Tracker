import { buildStockSeries } from './stock-series';
import { createFxConverter } from './fx';
import { Ticker, Transaction } from './types';

function ticker(name: string, entries: [string, number][]): Ticker {
  return {
    name,
    currency: 'USD',
    dates: entries.map(([d]) => new Date(d)),
    values: entries.map(([, v]) => v),
    dividends: [],
  };
}

function stockTx(date: string, amount: number, value: number): Transaction {
  return { ticker: 'ACME', type: 'stock', date: new Date(date), amount, value, currency: 'USD' };
}

const d = (s: string) => new Date(s);

describe('buildStockSeries', () => {
  describe('daily granularity (no FX)', () => {
    it('computes market value, cost basis and profit', () => {
      const dates = [d('2023-01-09'), d('2023-01-10'), d('2023-01-11')];
      const series = buildStockSeries({
        dates,
        granularity: 'daily',
        ticker: ticker('ACME', [['2023-01-10', 100], ['2023-01-11', 110]]),
        fx: null,
        stockTxs: [stockTx('2023-01-10', 2, 200)],
        stockTxsFx: [stockTx('2023-01-10', 2, 200)],
        commissionTxs: [],
        commissionTxsFx: [],
        snapshotCutoff: d('2023-01-09'),
        periodRangeStart: d('2023-01-09'),
        commissionSnapshotAmount: 'snapshot',
      });

      expect(series.aggregatedAmounts).toEqual([0, 2, 2]);
      expect(series.portfolioValues).toEqual([0, 200, 220]);
      expect(series.invested).toEqual([0, 200, 200]);
      expect(series.profit).toEqual([0, 0, 20]);
    });

    it('keeps a fully-sold position at zero value even when the price is missing', () => {
      const dates = [d('2023-01-10'), d('2023-01-11'), d('2023-01-12')];
      const series = buildStockSeries({
        dates,
        granularity: 'daily',
        // No price on 2023-01-12 (the day the position is already fully sold).
        ticker: ticker('ACME', [['2023-01-10', 100], ['2023-01-11', 110]]),
        fx: null,
        stockTxs: [stockTx('2023-01-10', 1, 100), stockTx('2023-01-11', -1, -110)],
        stockTxsFx: [stockTx('2023-01-10', 1, 100), stockTx('2023-01-11', -1, -110)],
        commissionTxs: [],
        commissionTxsFx: [],
        snapshotCutoff: d('2023-01-10'),
        periodRangeStart: d('2023-01-10'),
      });

      expect(series.aggregatedAmounts).toEqual([1, 0, 0]);
      expect(series.portfolioValues[2]).toBe(0);
    });
  });

  describe('closed-day handling', () => {
    it('carries the last known price across days with no ticker entry', () => {
      // 2023-01-11 has no ticker entry (e.g. a market holiday).
      const series = buildStockSeries({
        dates: [d('2023-01-10'), d('2023-01-11'), d('2023-01-12')],
        granularity: 'daily',
        ticker: ticker('ACME', [['2023-01-10', 100], ['2023-01-12', 120]]),
        fx: null,
        stockTxs: [stockTx('2023-01-10', 1, 100)],
        stockTxsFx: [stockTx('2023-01-10', 1, 100)],
        commissionTxs: [],
        commissionTxsFx: [],
        snapshotCutoff: d('2023-01-10'),
        periodRangeStart: d('2023-01-10'),
      });
      expect(series.portfolioValues).toEqual([100, 100, 120]);
      expect(series.profit).toEqual([0, 0, 20]);
    });

    it('uses the last known price on the leading date when it is a closed day', () => {
      // dates[0] is a closed day but shares were already held — previously this
      // produced a leading NaN that forwardFill could not backfill.
      const series = buildStockSeries({
        // dates[0] = Sunday (closed), dates[1] = Monday with price
        dates: [d('2023-01-08'), d('2023-01-09'), d('2023-01-10')],
        granularity: 'daily',
        ticker: ticker('ACME', [['2023-01-06', 90], ['2023-01-09', 100], ['2023-01-10', 110]]),
        fx: null,
        // stock was purchased before the range; snapshot carries 1 share in
        stockTxs: [stockTx('2023-01-05', 1, 90)],
        stockTxsFx: [stockTx('2023-01-05', 1, 90)],
        commissionTxs: [],
        commissionTxsFx: [],
        snapshotCutoff: d('2023-01-08'),
        periodRangeStart: d('2023-01-08'),
      });
      // Sunday: last known price before 2023-01-08 is 90 (from 2023-01-06)
      expect(series.portfolioValues[0]).toBe(90);
      expect(Number.isNaN(series.portfolioValues[0])).toBe(false);
    });
  });

  describe('monthly (period) granularity', () => {
    it('uses the last price on or before each period date', () => {
      const dates = [d('2023-01-31'), d('2023-02-28')];
      const series = buildStockSeries({
        dates,
        granularity: 'monthly',
        ticker: ticker('ACME', [['2023-01-20', 100], ['2023-02-20', 120]]),
        fx: null,
        stockTxs: [stockTx('2023-01-15', 1, 100)],
        stockTxsFx: [stockTx('2023-01-15', 1, 100)],
        commissionTxs: [],
        commissionTxsFx: [],
        snapshotCutoff: d('2023-01-01'),
        periodRangeStart: d('2023-01-01'),
      });

      expect(series.portfolioValues).toEqual([100, 120]);
      expect(series.invested).toEqual([100, 100]);
      expect(series.profit).toEqual([0, 20]);
    });
  });

  describe('with FX conversion', () => {
    it('scales market value at the per-date rate and cost basis at spot-at-purchase', () => {
      const dates = [d('2023-01-09'), d('2023-01-10'), d('2023-01-11')];
      const fxTickers = {
        'EUR=X': ticker('EUR=X', [
          ['2023-01-09', 0.9],
          ['2023-01-10', 0.9],
          ['2023-01-11', 0.9],
        ]),
      };
      const fx = createFxConverter('USD', 'EUR', fxTickers)!;
      const stockTxs = [stockTx('2023-01-10', 2, 200)];

      const series = buildStockSeries({
        dates,
        granularity: 'daily',
        ticker: ticker('ACME', [['2023-01-10', 100], ['2023-01-11', 110]]),
        fx,
        stockTxs,
        stockTxsFx: fx.convertTransactions(stockTxs),
        commissionTxs: [],
        commissionTxsFx: [],
        snapshotCutoff: d('2023-01-09'),
        periodRangeStart: d('2023-01-09'),
        commissionSnapshotAmount: 'snapshot',
      });

      // Market: [0,200,220] * 0.9 = [0,180,198]; cost basis 200*0.9 = 180.
      expect(series.portfolioValues).toEqual([0, 180, 198]);
      expect(series.invested).toEqual([0, 180, 180]);
      expect(series.profit[2]).toBeCloseTo(18);
    });
  });
});
