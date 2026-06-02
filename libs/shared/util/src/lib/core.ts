// Numeric-list and date primitives shared across the portfolio calculations.

import { ChartGranularity, TimeRange } from './types';

export function getDailyDates(start: Date, end: Date): Date[] {
  const dates: Date[] = [];
  const currentDate = new Date(start);
  currentDate.setDate(currentDate.getDate() - 1);

  while (currentDate <= end) {
    dates.push(new Date(currentDate));
    currentDate.setDate(currentDate.getDate() + 1);
  }

  return dates;
}

export function isSameDay(date1: Date, date2: Date): boolean {
  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
  );
}

export function getQuarter(month: number): number {
  return Math.floor(month / 3);
}

export function getMostRecentValueFromList(values: number[]): {
  value: number;
  index: number;
} {
  let index = values.length - 1;
  while (index >= 0) {
    if (values[index]) {
      return { value: values[index], index };
    }
    index -= 1;
  }

  return { value: 0, index: 0 };
}

export function getMostRecentValueAtIndex(values: number[], index: number) {
  return getMostRecentValueFromList(values.slice(0, index + 1)).value;
}

export function addLists(
  list1: number[],
  list2: number[],
  nanAsZero = false
): number[] {
  const result = [];
  for (let i = 0; i < list1.length; i++) {
    if (nanAsZero && Number.isNaN(list1[i]) !== Number.isNaN(list2[i])) {
      result.push(
        (Number.isNaN(list1[i]) ? 0 : list1[i]) +
          (Number.isNaN(list2[i]) ? 0 : list2[i])
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

/** True when d1 is strictly before d2 (ignoring time-of-day). */
export function isBeforeDay(d1: Date, d2: Date): boolean {
  if (d1.getFullYear() !== d2.getFullYear()) return d1.getFullYear() < d2.getFullYear();
  if (d1.getMonth() !== d2.getMonth()) return d1.getMonth() < d2.getMonth();
  return d1.getDate() < d2.getDate();
}

/** True when d1 is the same day as or before d2. */
export function isOnOrBeforeDay(d1: Date, d2: Date): boolean {
  return isSameDay(d1, d2) || isBeforeDay(d1, d2);
}

/** Returns the last day of each calendar month from start to end (inclusive). */
export function getMonthlyDates(start: Date, end: Date): Date[] {
  const dates: Date[] = [];
  const cursor = new Date(start.getFullYear(), start.getMonth(), 1);
  while (cursor <= end) {
    const lastDay = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0);
    dates.push(lastDay <= end ? lastDay : new Date(end));
    cursor.setMonth(cursor.getMonth() + 1);
  }
  return dates;
}

/** Returns one date every 7 days from start to end (last point clamped to end). */
export function getWeeklyDates(start: Date, end: Date): Date[] {
  const dates: Date[] = [];
  const cursor = new Date(start);
  while (cursor <= end) {
    dates.push(new Date(cursor));
    cursor.setDate(cursor.getDate() + 7);
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
export function getRangeStartDate(range: TimeRange, portfolioStart: Date): Date {
  const today = new Date();
  switch (range) {
    case '1M': return new Date(today.getFullYear(), today.getMonth() - 1, today.getDate());
    case '3M': return new Date(today.getFullYear(), today.getMonth() - 3, today.getDate());
    case '6M': return new Date(today.getFullYear(), today.getMonth() - 6, today.getDate());
    case 'YTD': return new Date(today.getFullYear(), 0, 1);
    case '1Y': return new Date(today.getFullYear() - 1, today.getMonth(), today.getDate());
    case '5Y': return new Date(today.getFullYear() - 5, today.getMonth(), today.getDate());
    case 'ALL': return portfolioStart;
  }
}

export function addPerQuarterByYearLists(
  list1: { year: string; data: number[] }[],
  list2: { year: string; data: number[] }[]
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
