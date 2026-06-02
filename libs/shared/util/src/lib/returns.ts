import { Return, Ticker } from './types';
import {
  getMostRecentValueAtIndex,
  getMostRecentValueFromList,
  isBeforeDay,
  isOnOrBeforeDay,
  isSameDay,
} from './core';

/**
 * Growth factor of one TWR sub-period [i-1, i]. Returns 1 (a no-op for the
 * chained product) when the period can't contribute a market return:
 *   - no capital at the start (Vprev <= 0): a position is being established or
 *     was previously fully sold — the deposit itself is not a return;
 *   - any input is non-finite (e.g. a missing price in an aggregate series).
 * Otherwise strips the external cash flow out of the end value so only the
 * price-driven change is measured:  factor = (Vcurr - flow) / Vprev.
 *
 *   flow  = invested[i] - invested[i-1]   (buy +, sell −)
 */
function subPeriodFactor(
  values: number[],
  invested: number[],
  i: number
): number {
  const vPrev = values[i - 1];
  const vCurr = values[i];
  const flow = invested[i] - invested[i - 1];
  if (
    !Number.isFinite(vPrev) ||
    !Number.isFinite(vCurr) ||
    !Number.isFinite(flow) ||
    vPrev <= 0
  ) {
    return 1;
  }
  return (vCurr - flow) / vPrev;
}

/**
 * Time-weighted return (TWR) over a value series with external cash flows.
 *   values[i]   = holdings market value at point i (display currency)
 *   invested[i] = cumulative net capital invested up to point i (the
 *                 stock-transaction aggregate), so Δinvested[i] is the external
 *                 cash flow into holdings at point i (buy +, sell −).
 *
 * Chains each sub-period's growth factor and returns the cumulative return as a
 * fraction (0.2 = +20%) over [0, n-1]. Insensitive to the timing/size of cash
 * flows, so it never divides cumulative profit by a tiny current value — a
 * fully-sold position's realized gain is captured in its sale-period factor and
 * later zero-holding periods are skipped. Empty/single-point/no-capital → 0.
 */
export function timeWeightedReturn(
  values: number[],
  invested: number[]
): number {
  if (values.length < 2) return 0;
  let product = 1;
  for (let i = 1; i < values.length; i++) {
    product *= subPeriodFactor(values, invested, i);
  }
  return product - 1;
}

export function getYieldPerYear(
  dates: Date[],
  portfolioValues: number[],
  invested: number[],
  profitValues: number[]
): { years: string[]; yields: number[]; profit: number[] } {
  const years: string[] = [];
  const yields: number[] = [];
  const profit: number[] = [];
  let profitLastYear = 0;
  // Running TWR product for the current calendar year. Sub-period factors are
  // computed across the year boundary (point i-1 may be in the prior year), so
  // each year's return chains correctly from the prior year-end value.
  let yearProduct = 1;
  dates.forEach((date, index) => {
    if (index > 0) {
      yearProduct *= subPeriodFactor(portfolioValues, invested, index);
    }
    const isLast = index + 1 === dates.length;
    const isYearEnd = isLast || dates[index + 1].getUTCFullYear() !== date.getUTCFullYear();
    if (isYearEnd) {
      years.push(date.getUTCFullYear().toString());
      const profitThisYear =
        getMostRecentValueAtIndex(profitValues, index) - profitLastYear;
      profit.push(profitThisYear);
      yields.push((yearProduct - 1) * 100);
      profitLastYear = getMostRecentValueAtIndex(profitValues, index);
      yearProduct = 1;
    }
  });
  return { years, yields, profit };
}

export function getPortfolioValues(
  dates: Date[],
  aggregatedAmounts: number[],
  ticker: Ticker
): number[] {
  const values: number[] = [];
  let index = 0;
  let lastKnownPrice = 0;

  for (let i = 0; i < dates.length; i++) {
    // Advance past all ticker dates strictly before dates[i], tracking last known price.
    while (index < ticker.dates.length && isBeforeDay(ticker.dates[index], dates[i])) {
      if (ticker.values[index] > 0) lastKnownPrice = ticker.values[index];
      index++;
    }

    // Holding nothing is worth exactly 0 on any date, regardless of whether a
    // price is available — e.g. after a position is fully sold. (Without this a
    // missing price would make 0-share days NaN and corrupt profit.)
    if (aggregatedAmounts[i] === 0) {
      if (index < ticker.dates.length && isSameDay(ticker.dates[index], dates[i])) {
        const price = ticker.values[index];
        index++;
        while (index < ticker.dates.length && isSameDay(ticker.dates[index], dates[i])) {
          index++;
        }
        if (price > 0) lastKnownPrice = price;
      }
      values.push(0);
      continue;
    }

    if (index < ticker.dates.length && isSameDay(ticker.dates[index], dates[i])) {
      // Exact date match — use this price.
      let price = ticker.values[index];
      index++;
      // Consume any duplicate entries for the same date (edge case).
      while (index < ticker.dates.length && isSameDay(ticker.dates[index], dates[i])) {
        price = ticker.values[index];
        index++;
      }
      if (price > 0) lastKnownPrice = price;
      values.push(price * aggregatedAmounts[i]);
    } else {
      // No ticker entry for this date (weekend / holiday / before ticker starts).
      values.push(lastKnownPrice === 0 ? 0 : NaN);
    }
  }
  return values;
}

/**
 * Period-based portfolio value computation for weekly/monthly granularity.
 * For each period date, finds the last available ticker price on or before
 * that date and multiplies by the aggregated share count.
 */
export function getPortfolioValuesByPeriod(
  periodDates: Date[],
  aggregatedAmounts: number[],
  ticker: Ticker
): number[] {
  const values: number[] = [];
  let tickerIdx = 0;
  let lastKnownPrice = 0;

  for (let i = 0; i < periodDates.length; i++) {
    const periodDate = periodDates[i];
    while (tickerIdx < ticker.dates.length && isOnOrBeforeDay(ticker.dates[tickerIdx], periodDate)) {
      if (ticker.values[tickerIdx] > 0) lastKnownPrice = ticker.values[tickerIdx];
      tickerIdx++;
    }
    values.push(lastKnownPrice * aggregatedAmounts[i]);
  }

  return values;
}

/**
 * Return over the trailing `days` window.
 *   absolute   = change in cumulative profit across the window.
 *   percentage = that change as a fraction of gross invested capital (cost
 *                basis), so it reconciles with the euro figure and never blows
 *                up when a position has been sold (gross invested only grows).
 */
export function getReturn(
  profit: number[],
  grossInvested: number,
  days: number
): Return {
  const mostRecentProfit = getMostRecentValueFromList(profit);
  const startIndex =
    mostRecentProfit.index - days < 0 ? 0 : mostRecentProfit.index - days;
  const profitDaysAgo = getMostRecentValueFromList(profit.slice(0, startIndex));
  const absolute = mostRecentProfit.value - profitDaysAgo.value;

  return {
    absolute,
    percentage:
      Number.isFinite(grossInvested) && grossInvested !== 0
        ? (absolute / grossInvested) * 100
        : 0,
  };
}
