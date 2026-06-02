import {
  DividendTransactionChartData,
  Ticker,
  Transaction,
  YearQuarter,
} from './types';
import { getQuarter, isOnOrBeforeDay } from './core';
import { getTransactionAmountsAndValues, getTransactionAmountsAndValuesByPeriod } from './transactions';

export function getDividendPerQuarterByYear(
  startDate: Date,
  dividends: Transaction[]
): { year: string; data: number[] }[] {
  const dividendsByYear: { [year: string]: number[] } = {};

  dividends.forEach((dividend) => {
    const year = dividend.date.getFullYear().toString();
    const quarter = getQuarter(dividend.date.getMonth());
    if (!dividendsByYear[year]) {
      dividendsByYear[year] = [0, 0, 0, 0];
    }
    dividendsByYear[year][quarter] += dividend.value;
  });

  const startYear = startDate.getFullYear();
  const endYear = new Date().getFullYear(); // Always go up to the current year

  const result: { year: string; data: number[] }[] = [];
  for (let year = startYear; year <= endYear; year++) {
    result.push({
      year: year.toString(),
      data: dividendsByYear[year] ?? [0, 0, 0, 0],
    });
  }

  return result;
}

export function getDividendPerQuarter(
  startDate: Date,
  dividendPerQuarterByYear: { year: string; data: number[] }[]
): { yearQuarters: YearQuarter[]; dividends: number[] } {
  const now = new Date();
  const yearQuarters: YearQuarter[] = [];
  const dividends: number[] = [];

  for (const dividendByYear of dividendPerQuarterByYear) {
    dividendByYear.data.forEach((dividend, quarter) => {
      if (
        (dividendByYear.year !== startDate.getFullYear().toString() ||
          quarter >= getQuarter(startDate.getMonth())) &&
        (dividendByYear.year !== now.getFullYear().toString() ||
          quarter <= getQuarter(now.getMonth()))
      ) {
        yearQuarters.push({
          year: dividendByYear.year,
          quarter,
        });
        dividends.push(dividend);
      }
    });
  }

  return { yearQuarters, dividends };
}

export function getDividendTtmPerQuarter(dividendPerQuarter: {
  yearQuarters: YearQuarter[];
  dividends: number[];
}): { yearQuarters: YearQuarter[]; dividends: number[] } {
  return {
    yearQuarters: dividendPerQuarter.yearQuarters,
    dividends: dividendPerQuarter.dividends.map((_, i) => {
      const start = Math.max(0, i - 3);
      const end = i + 1;

      return dividendPerQuarter.dividends
        .slice(start, end)
        .reduce((acc, val) => acc + val, 0);
    }),
  };
}

export function updateDividends(
  dividend: DividendTransactionChartData,
  amountOfShares: number[],
  ticker: Ticker,
  dates: Date[],
  startDate: Date
): DividendTransactionChartData {
  const transactions: Transaction[] = ticker.dividends.map((dividend) => {
    const amount = getAmountOfSharesForDate(
      amountOfShares,
      dates,
      dividend.date
    );
    return {
      ticker: ticker.name,
      type: 'dividend',
      date: dividend.date,
      amount,
      value: dividend.amountPerShare * amount,
      currency: ticker.currency,
    };
  });

  const dividendTransactionAmountsAndValues = getTransactionAmountsAndValues(
    dates,
    transactions
  );
  const dividendPerQuarterByYear = getDividendPerQuarterByYear(
    startDate,
    transactions
  );
  const dividendPerQuarter = getDividendPerQuarter(
    startDate,
    dividendPerQuarterByYear
  );
  const dividendTtmPerQuarter = getDividendTtmPerQuarter(dividendPerQuarter);

  const result = {
    ...dividendTransactionAmountsAndValues,
    perQuarterByYear: dividendPerQuarterByYear,
    perQuarter: dividendPerQuarter,
    ttmPerQuarter: dividendTtmPerQuarter,
  };
  return result;
}

/**
 * Returns the share count from the last period date that is on or before the
 * given date. Works correctly for both daily dates (exact match) and for
 * weekly/monthly period dates (last period before the dividend date).
 */
function getAmountOfSharesForDate(
  amountOfShares: number[],
  dates: Date[],
  date: Date
): number {
  let result = 0;
  for (let i = 0; i < dates.length; i++) {
    if (isOnOrBeforeDay(dates[i], date)) {
      result = amountOfShares[i];
    } else {
      break;
    }
  }
  return result;
}

/**
 * Period-based variant of updateDividends for weekly/monthly granularity.
 * Uses getTransactionAmountsAndValuesByPeriod instead of the daily version.
 */
export function updateDividendsByPeriod(
  amountOfShares: number[],
  ticker: Ticker,
  periodDates: Date[],
  rangeStart: Date,
  startDate: Date
): DividendTransactionChartData {
  const transactions: Transaction[] = ticker.dividends.map((div) => {
    const amount = getAmountOfSharesForDate(amountOfShares, periodDates, div.date);
    return {
      ticker: ticker.name,
      type: 'dividend',
      date: div.date,
      amount,
      value: div.amountPerShare * amount,
      currency: ticker.currency,
    };
  });

  const dividendTransactionAmountsAndValues = getTransactionAmountsAndValuesByPeriod(
    periodDates,
    transactions,
    rangeStart
  );
  const dividendPerQuarterByYear = getDividendPerQuarterByYear(startDate, transactions);
  const dividendPerQuarter = getDividendPerQuarter(startDate, dividendPerQuarterByYear);
  const dividendTtmPerQuarter = getDividendTtmPerQuarter(dividendPerQuarter);

  return {
    ...dividendTransactionAmountsAndValues,
    perQuarterByYear: dividendPerQuarterByYear,
    perQuarter: dividendPerQuarter,
    ttmPerQuarter: dividendTtmPerQuarter,
  };
}
