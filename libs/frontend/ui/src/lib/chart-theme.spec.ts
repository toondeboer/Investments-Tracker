import { formatAxisDate, formatMoney, round2, spanDays } from './chart-theme';

describe('chart-theme helpers', () => {
  describe('round2', () => {
    it('rounds to 2 decimals', () => {
      expect(round2(124.38000000002)).toBe(124.38);
      expect(round2(124.327)).toBe(124.33);
      expect(round2(124.324)).toBe(124.32);
      expect(round2(10)).toBe(10);
    });
  });

  describe('formatMoney', () => {
    it('appends the symbol when provided', () => {
      expect(formatMoney(124.38000000002, '€')).toBe('124.38 €');
    });

    it('omits the symbol when not provided', () => {
      expect(formatMoney(124.38000000002)).toBe('124.38');
    });

    it('returns empty string for NaN', () => {
      expect(formatMoney(NaN, '€')).toBe('');
    });
  });

  describe('formatAxisDate', () => {
    const ms = Date.UTC(2024, 5, 28); // 28 Jun 2024

    it('shows the day for short spans (<= 1 year)', () => {
      expect(formatAxisDate(ms, 90)).toBe('28 Jun 2024');
    });

    it("collapses to month-year for long spans", () => {
      expect(formatAxisDate(ms, 1000)).toBe("Jun '24");
    });
  });

  describe('spanDays', () => {
    it('returns 0 for fewer than 2 dates', () => {
      expect(spanDays([])).toBe(0);
      expect(spanDays([new Date()])).toBe(0);
    });

    it('returns the day span between first and last date', () => {
      const start = new Date(Date.UTC(2024, 0, 1));
      const end = new Date(Date.UTC(2024, 0, 11));
      expect(spanDays([start, new Date(Date.UTC(2024, 0, 5)), end])).toBe(10);
    });
  });
});
