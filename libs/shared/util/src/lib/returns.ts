import { Return, Ticker } from './types';
import {
  getMostRecentValueAtIndex,
  getMostRecentValueFromList,
  isBeforeDay,
  isOnOrBeforeDay,
  isSameDay,
} from './core';

/**
 * Annual return (%) for each calendar year, in isolation, via the **Modified
 * Dietz** method — a closed-form, money-weighted return that credits the timing
 * of cash flows within the year without XIRR's root-finding or its annualisation
 * blow-up on partial (first / current) years.
 *
 * For each year spanning [start, end]:
 *   gain        = EMV − BMV − netFlows
 *   avgCapital  = BMV + Σ wᵢ·flowᵢ        wᵢ = (end − flowDateᵢ) / (end − start)
 *   return %    = gain / avgCapital × 100
 *
 * BMV / EMV are the portfolio market value at the year's start (= the prior
 * year-end point, or 0 before the first investment) and end. A `flow` is money
 * entering the portfolio over a sub-period: a buy (+), a sell (−), and a
 * dividend paid out (−, since the cash leaves) — so dividends surface as return
 * inside `gain`. `profit` returns that same `gain` (the money made that year,
 * incl. dividends) for the secondary line.
 *
 * Inputs are the full-history monthly series. The cumulative arrays carry
 * forward, so the Δ between two points is the net flow over that month.
 */
export function getYieldPerYear(
  dates: Date[],
  portfolioValues: number[],
  netInvested: number[],
  dividends: number[]
): { years: string[]; yields: number[]; profit: number[] } {
  const years: string[] = [];
  const yields: number[] = [];
  const profit: number[] = [];

  const value = (i: number) => getMostRecentValueAtIndex(portfolioValues, i);
  // Cumulative value at point i, treating anything before the series as 0.
  const cum = (arr: number[], i: number) =>
    i < 0 ? 0 : getMostRecentValueAtIndex(arr, i);

  let firstIdx = 0;
  dates.forEach((date, index) => {
    const isLast = index + 1 === dates.length;
    const isYearEnd =
      isLast || dates[index + 1].getUTCFullYear() !== date.getUTCFullYear();
    if (!isYearEnd) return;

    const lastIdx = index;
    const prevIdx = firstIdx - 1; // last point of the previous year, or -1
    const bmv = prevIdx >= 0 ? value(prevIdx) : 0;
    const emv = value(lastIdx);

    // Period spans from the prior year-end (or this year's first point when
    // there's no history yet) to this year-end.
    const start = (prevIdx >= 0 ? dates[prevIdx] : dates[firstIdx]).getTime();
    const end = dates[lastIdx].getTime();
    const span = end - start;

    let netFlows = 0;
    let weightedFlows = 0;
    for (let i = firstIdx; i <= lastIdx; i++) {
      const stockFlow = cum(netInvested, i) - cum(netInvested, i - 1);
      const dividendFlow = cum(dividends, i) - cum(dividends, i - 1);
      const flow = stockFlow - dividendFlow; // dividend paid out = withdrawal
      netFlows += flow;
      const weight = span > 0 ? (end - dates[i].getTime()) / span : 1;
      weightedFlows += weight * flow;
    }

    const gain = emv - bmv - netFlows;
    const avgCapital = bmv + weightedFlows;

    years.push(date.getUTCFullYear().toString());
    // avgCapital can cross zero when a position is opened and closed inside one
    // year (a documented Modified-Dietz limitation) — guard to keep it finite.
    yields.push(avgCapital > 0 ? (gain / avgCapital) * 100 : 0);
    profit.push(gain);

    firstIdx = index + 1;
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
      // No ticker entry for this date (weekend / holiday). Use the last known
      // price — forward-fill at the source so the series is always continuous.
      values.push(lastKnownPrice * aggregatedAmounts[i]);
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
