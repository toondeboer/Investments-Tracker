import { Return, Ticker } from './types';
import {
  getMostRecentValueAtIndex,
  getMostRecentValueFromList,
  isBeforeDay,
  isOnOrBeforeDay,
  isSameDay,
} from './core';

/**
 * Total return (%) at each calendar year-end, using the same simple formula as
 * the headline figure, evaluated on a cumulative (start-of-time → year-end)
 * basis:
 *
 *   total return % = (sale proceeds + value − purchase cost + dividends)
 *                    / purchase cost × 100
 *
 * Expressed with the series this function receives (all cumulative to year-end):
 *   netInvested   = purchase cost − sale proceeds   (signed buys − sells)
 *   grossInvested = purchase cost                    (buys only, never reduced)
 *   so   value − netInvested + dividends == sale proceeds + value − purchase
 *   cost + dividends   (the formula's numerator).
 *
 * Using gross purchase cost as the denominator keeps it stable: a fully-sold
 * position can't collapse it to zero and blow the percentage up.
 *
 * `profit` is the change in that total-return profit during the year (the money
 * made that year, including dividends received), for the secondary line.
 */
export function getYieldPerYear(
  dates: Date[],
  portfolioValues: number[],
  netInvested: number[],
  grossInvested: number[],
  dividends: number[]
): { years: string[]; yields: number[]; profit: number[] } {
  const years: string[] = [];
  const yields: number[] = [];
  const profit: number[] = [];
  let profitLastYear = 0;
  dates.forEach((date, index) => {
    const isLast = index + 1 === dates.length;
    const isYearEnd =
      isLast || dates[index + 1].getUTCFullYear() !== date.getUTCFullYear();
    if (!isYearEnd) return;

    const value = getMostRecentValueAtIndex(portfolioValues, index);
    const net = getMostRecentValueAtIndex(netInvested, index);
    const gross = getMostRecentValueAtIndex(grossInvested, index);
    const dividend = getMostRecentValueAtIndex(dividends, index);

    // Cumulative total-return profit to this year-end (€).
    const totalReturnProfit = value - net + dividend;

    years.push(date.getUTCFullYear().toString());
    yields.push(gross > 0 ? (totalReturnProfit / gross) * 100 : 0);
    profit.push(totalReturnProfit - profitLastYear);
    profitLastYear = totalReturnProfit;
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
