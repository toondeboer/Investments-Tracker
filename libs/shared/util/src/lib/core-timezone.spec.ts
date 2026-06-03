import {
  getMonthlyDates,
  isBeforeDay,
  isOnOrBeforeDay,
  isSameDay,
} from './core';
import { getYieldPerYear } from './returns';

/**
 * These assertions use absolute UTC ("Z") instants and only hold when the
 * date helpers reason in UTC. Under the previous local-time implementation they
 * fail in any non-UTC runner (the suite is pinned to America/New_York in
 * jest.config.ts), which is exactly the off-by-one a European user would hit.
 */
describe('date helpers are timezone-independent (UTC)', () => {
  it('isSameDay: two instants on the same UTC day, far apart in local time', () => {
    expect(
      isSameDay(
        new Date('2023-03-15T23:30:00.000Z'),
        new Date('2023-03-15T00:30:00.000Z')
      )
    ).toBe(true);
  });

  it('isSameDay: instants straddling UTC midnight are different days', () => {
    expect(
      isSameDay(
        new Date('2023-03-15T23:30:00.000Z'),
        new Date('2023-03-16T00:30:00.000Z')
      )
    ).toBe(false);
  });

  it('isBeforeDay / isOnOrBeforeDay compare UTC calendar days', () => {
    const late = new Date('2023-03-15T23:30:00.000Z');
    const earlyNext = new Date('2023-03-16T00:30:00.000Z');
    expect(isBeforeDay(late, earlyNext)).toBe(true);
    expect(isOnOrBeforeDay(late, new Date('2023-03-15T00:00:00.000Z'))).toBe(true);
    expect(isBeforeDay(earlyNext, late)).toBe(false);
  });

  it('getMonthlyDates returns UTC month-ends regardless of runner timezone', () => {
    const dates = getMonthlyDates(
      new Date('2023-01-15T00:00:00.000Z'),
      new Date('2023-03-20T00:00:00.000Z')
    );
    // Jan 31, Feb 28, then clamped to the end (Mar 20) — all in UTC.
    expect(dates.map((d) => d.toISOString().slice(0, 10))).toEqual([
      '2023-01-31',
      '2023-02-28',
      '2023-03-20',
    ]);
  });

  it('getYieldPerYear detects the Dec-31 UTC year-end', () => {
    const dates = [
      new Date('2023-12-30T00:00:00.000Z'),
      new Date('2023-12-31T00:00:00.000Z'), // UTC year-end
      new Date('2024-01-01T00:00:00.000Z'),
    ];
    const result = getYieldPerYear(
      dates,
      [100, 100, 200], // portfolio value
      [100, 100, 100], // cumulative net invested
      [0, 0, 0]        // cumulative dividends
    );
    expect(result.years).toEqual(['2023', '2024']);
  });
});
