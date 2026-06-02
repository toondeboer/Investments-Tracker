import { Return, Ticker } from './types';
import {
  getMostRecentValueAtIndex,
  getMostRecentValueFromList,
  isBeforeDay,
  isOnOrBeforeDay,
  isSameDay,
} from './core';

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
  const values: number[] = [];
  let index = 0;
  let lastKnownPrice = 0;

  for (let i = 0; i < dates.length; i++) {
    // Advance past all ticker dates strictly before dates[i], tracking last known price.
    while (index < ticker.dates.length && isBeforeDay(ticker.dates[index], dates[i])) {
      if (ticker.values[index] > 0) lastKnownPrice = ticker.values[index];
      index++;
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
  const mostRecentPortfolioValue =
    getMostRecentValueFromList(portfolioValues).value;

  return {
    absolute,
    percentage:
      mostRecentPortfolioValue !== 0
        ? (absolute / mostRecentPortfolioValue) * 100
        : 0,
  };
}
