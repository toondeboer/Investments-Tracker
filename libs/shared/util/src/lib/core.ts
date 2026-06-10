// Numeric-list and date primitives shared across the portfolio calculations.

import { ChartGranularity, TimeRange } from './types';

// All day-level reasoning is done in UTC. Transaction dates are parsed from
// date-only ISO strings (UTC midnight) and Yahoo timestamps are absolute
// instants, so comparing/generating days in UTC keeps prices, FX rates and
// transactions aligned regardless of the viewer's local timezone.

export function getDailyDates(start: Date, end: Date): Date[] {
  const dates: Date[] = [];
  const currentDate = new Date(start);
  currentDate.setUTCDate(currentDate.getUTCDate() - 1);

  while (currentDate <= end) {
    dates.push(new Date(currentDate));
    currentDate.setUTCDate(currentDate.getUTCDate() + 1);
  }

  return dates;
}

export function isSameDay(date1: Date, date2: Date): boolean {
  return (
    date1.getUTCFullYear() === date2.getUTCFullYear() &&
    date1.getUTCMonth() === date2.getUTCMonth() &&
    date1.getUTCDate() === date2.getUTCDate()
  );
}

export function getQuarter(month: number): number {
  return Math.floor(month / 3);
}

/** True for values that are not a real, usable number (NaN / null / undefined). */
export function isMissing(value: number): boolean {
  return value === null || value === undefined || Number.isNaN(value);
}

/**
 * Returns the most recent *present* value and its index. "Present" skips
 * NaN/null/undefined placeholders (missing prices, weekend/holiday gaps) but
 * treats a legitimate `0` as a real value — e.g. a fully-sold position has 0
 * shares now, and a flat day has 0 profit; neither should walk backwards to a
 * stale earlier number.
 *
 * Returns { value: 0, index: -1 } when the list contains no present value.
 */
export function getMostRecentValueFromList(values: number[]): {
  value: number;
  index: number;
} {
  let index = values.length - 1;
  while (index >= 0) {
    if (!isMissing(values[index])) {
      return { value: values[index], index };
    }
    index -= 1;
  }

  return { value: 0, index: -1 };
}

export function getMostRecentValueAtIndex(values: number[], index: number) {
  return getMostRecentValueFromList(values.slice(0, index + 1)).value;
}

/**
 * Replaces gap values (NaN) with the most recent prior finite value, so a held
 * position carries its last known market value across days its market was
 * closed (weekends/holidays) instead of reading as a gap. Leading gaps with no
 * prior value are left untouched. A genuine 0 (e.g. a fully-sold position) is
 * finite and therefore preserved, not back-filled.
 *
 * This matters when summing per-stock daily value series whose markets keep
 * different calendars (e.g. NYSE vs Euronext): without it, a stock that is
 * merely closed for the day would contribute 0 to the aggregate and distort
 * day-over-day return maths.
 */
export function forwardFillValues(values: number[]): number[] {
  const out = values.slice();
  let last = NaN;
  for (let i = 0; i < out.length; i++) {
    if (Number.isFinite(out[i])) {
      last = out[i];
    } else if (Number.isFinite(last)) {
      out[i] = last;
    }
  }
  return out;
}

export function addLists(
  list1: number[],
  list2: number[],
  nanAsZero = false,
): number[] {
  const result = [];
  for (let i = 0; i < list1.length; i++) {
    if (nanAsZero && Number.isNaN(list1[i]) !== Number.isNaN(list2[i])) {
      result.push(
        (Number.isNaN(list1[i]) ? 0 : list1[i]) +
          (Number.isNaN(list2[i]) ? 0 : list2[i]),
      );
    } else {
      result.push(list1[i] + list2[i]);
    }
  }
  return result;
}

export function subtractLists(list1: number[], list2: number[]): number[] {
  const result = [];
  for (let i = 0; i < list1.length; i++) {
    result.push(list1[i] - list2[i]);
  }
  return result;
}

export function multiplyLists(list1: number[], list2: number[]): number[] {
  const result = [];
  for (let i = 0; i < list1.length; i++) {
    result.push(list1[i] * list2[i]);
  }
  return result;
}

/** True when d1 is strictly before d2 (ignoring time-of-day), in UTC. */
export function isBeforeDay(d1: Date, d2: Date): boolean {
  if (d1.getUTCFullYear() !== d2.getUTCFullYear())
    return d1.getUTCFullYear() < d2.getUTCFullYear();
  if (d1.getUTCMonth() !== d2.getUTCMonth())
    return d1.getUTCMonth() < d2.getUTCMonth();
  return d1.getUTCDate() < d2.getUTCDate();
}

/** True when d1 is the same day as or before d2. */
export function isOnOrBeforeDay(d1: Date, d2: Date): boolean {
  return isSameDay(d1, d2) || isBeforeDay(d1, d2);
}

/** Returns the last day of each calendar month from start to end (inclusive), in UTC. */
export function getMonthlyDates(start: Date, end: Date): Date[] {
  const dates: Date[] = [];
  const cursor = new Date(
    Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), 1),
  );
  while (cursor <= end) {
    const lastDay = new Date(
      Date.UTC(cursor.getUTCFullYear(), cursor.getUTCMonth() + 1, 0),
    );
    dates.push(lastDay <= end ? lastDay : new Date(end));
    cursor.setUTCMonth(cursor.getUTCMonth() + 1);
  }
  return dates;
}

/** Returns one date every 7 days from start to end (last point clamped to end). */
export function getWeeklyDates(start: Date, end: Date): Date[] {
  const dates: Date[] = [];
  const cursor = new Date(start);
  while (cursor <= end) {
    dates.push(new Date(cursor));
    cursor.setUTCDate(cursor.getUTCDate() + 7);
  }
  if (dates.length > 0 && !isSameDay(dates[dates.length - 1], end)) {
    dates[dates.length - 1] = new Date(end);
  }
  return dates;
}

export function getGranularityForRange(range: TimeRange): ChartGranularity {
  if (range === 'ALL') return 'monthly';
  if (range === '5Y') return 'weekly';
  return 'daily';
}

/**
 * Returns the chart start date for the selected range.
 * portfolioStart is used for 'ALL' to return the full history.
 */
export function getRangeStartDate(
  range: TimeRange,
  portfolioStart: Date,
): Date {
  const today = new Date();
  const y = today.getUTCFullYear();
  const m = today.getUTCMonth();
  const d = today.getUTCDate();
  switch (range) {
    case '1M':
      return new Date(Date.UTC(y, m - 1, d));
    case '3M':
      return new Date(Date.UTC(y, m - 3, d));
    case '6M':
      return new Date(Date.UTC(y, m - 6, d));
    case 'YTD':
      return new Date(Date.UTC(y, 0, 1));
    case '1Y':
      return new Date(Date.UTC(y - 1, m, d));
    case '5Y':
      return new Date(Date.UTC(y - 5, m, d));
    case 'ALL':
      return portfolioStart;
  }
}

export function addPerQuarterByYearLists(
  list1: { year: string; data: number[] }[],
  list2: { year: string; data: number[] }[],
): { year: string; data: number[] }[] {
  const result = [];
  for (let i = 0; i < list1.length; i++) {
    result.push({
      year: list1[i].year,
      data: addLists(list1[i].data, list2[i].data),
    });
  }
  return result;
}
