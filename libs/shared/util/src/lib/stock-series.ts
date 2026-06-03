import { ChartGranularity, Ticker, Transaction } from './types';
import { FxConverter } from './fx';
import { multiplyLists, subtractLists } from './core';
import { getPortfolioValues, getPortfolioValuesByPeriod } from './returns';
import {
  computePreRangeSnapshot,
  getTransactionAmountsAndValues,
  getTransactionAmountsAndValuesByPeriod,
} from './transactions';

/**
 * Inputs for {@link buildStockSeries}. The caller supplies both the native
 * transaction streams and their spot-at-purchase FX-converted counterparts
 * (already produced via {@link FxConverter.convertTransactions}); the builder
 * picks the right stream based on whether `fx` is present.
 */
export interface StockSeriesParams {
  dates: Date[];
  /** `'daily'` uses the pre-range snapshot baseline; `'weekly'`/`'monthly'` use periodRangeStart. */
  granularity: ChartGranularity;
  ticker: Ticker;
  /** When non-null, market value is scaled per-date and cost basis re-aggregated at spot-at-purchase. */
  fx: FxConverter | null;
  stockTxs: Transaction[];
  stockTxsFx: Transaction[];
  commissionTxs: Transaction[];
  commissionTxsFx: Transaction[];
  /** Daily-granularity snapshot cutoff (everything strictly before this date). */
  snapshotCutoff: Date;
  /** Period-granularity range start passed to the by-period aggregators. */
  periodRangeStart: Date;
  /**
   * Commission share-count baseline for the daily snapshot. The 30-day return
   * window seeds it at 0 (commission share counts are irrelevant to its profit);
   * the selected-range chart uses the real snapshot amount so its output matches
   * the stage-1 commission arrays. Ignored for period granularity.
   */
  commissionSnapshotAmount?: 'snapshot' | 'zero';
}

/**
 * The per-stock series consumed by the portfolio engine: market value, cost
 * basis (`invested`), `commission`, and `profit`, plus the transaction-level
 * arrays the selected-range chart needs. All values are in the display currency
 * when `fx` is present.
 */
export interface StockSeries {
  portfolioValues: number[];
  invested: number[];
  commission: number[];
  profit: number[];
  stockTransactionValues: number[];
  commissionTransactionValues: number[];
  aggregatedAmounts: number[];
}

/**
 * Builds one stock's value/cost/profit series over a date set at a given
 * granularity, applying FX when a converter is supplied. This is the single
 * pipeline shared by the three views the engine produces — the selected range,
 * the all-time monthly series, and the 30-day return window — which previously
 * duplicated this logic three times.
 */
export function buildStockSeries(p: StockSeriesParams): StockSeries {
  const { dates, ticker, fx } = p;
  const daily = p.granularity === 'daily';

  // Aggregate one transaction stream to the date set at the right granularity.
  // For daily, seed from the pre-range snapshot; commission share counts can be
  // forced to 0 ('zero') since they're irrelevant to profit.
  const aggregate = (txs: typeof p.stockTxs, seed: 'snapshot' | 'zero') => {
    if (!daily) return getTransactionAmountsAndValuesByPeriod(dates, txs, p.periodRangeStart);
    const snap = computePreRangeSnapshot(txs, p.snapshotCutoff);
    return getTransactionAmountsAndValues(dates, txs, seed === 'zero' ? 0 : snap.amount, snap.value);
  };
  const commSeed = p.commissionSnapshotAmount === 'zero' ? 'zero' : 'snapshot';

  // Native amounts/values drive share counts and the native cost basis.
  const stockAgg = aggregate(p.stockTxs, 'snapshot');
  const commAgg = aggregate(p.commissionTxs, commSeed);

  let portfolioValues = daily
    ? getPortfolioValues(dates, stockAgg.aggregatedAmounts, ticker)
    : getPortfolioValuesByPeriod(dates, stockAgg.aggregatedAmounts, ticker);

  let invested = stockAgg.aggregatedValues;
  let commission = commAgg.aggregatedValues;
  let stockTransactionValues = stockAgg.transactionValues;
  let commissionTransactionValues = commAgg.transactionValues;

  if (fx) {
    // Market value: per-date spot rate. Cost basis / commission: re-aggregated
    // from the spot-at-purchase converted transactions.
    portfolioValues = multiplyLists(portfolioValues, fx.getScaledRates(dates));

    const stockAggFx = aggregate(p.stockTxsFx, 'snapshot');
    const commAggFx = aggregate(p.commissionTxsFx, commSeed);

    invested = stockAggFx.aggregatedValues;
    commission = commAggFx.aggregatedValues;
    stockTransactionValues = stockAggFx.transactionValues;
    commissionTransactionValues = commAggFx.transactionValues;
  }

  const profit = subtractLists(subtractLists(portfolioValues, invested), commission);

  return {
    portfolioValues,
    invested,
    commission,
    profit,
    stockTransactionValues,
    commissionTransactionValues,
    aggregatedAmounts: stockAgg.aggregatedAmounts,
  };
}
