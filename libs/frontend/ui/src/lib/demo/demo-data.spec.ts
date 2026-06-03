import {
  buildDemoAnnualReturns,
  buildDemoQuarterlyDividends,
  buildDemoSeries,
  buildDemoSummary,
  buildDemoTtmDividends,
} from './demo-data';

describe('demo-data', () => {
  describe('buildDemoSeries', () => {
    it('produces a full year of aligned, ascending-date arrays', () => {
      const s = buildDemoSeries();
      expect(s.dates).toHaveLength(365);
      expect(s.portfolioValues).toHaveLength(365);
      expect(s.invested).toHaveLength(365);
      expect(s.profit).toHaveLength(365);
      expect(s.cumulativeDividend).toHaveLength(365);
      expect(s.cumulativeCommission).toHaveLength(365);
      expect(s.dates[0].getTime()).toBeLessThan(s.dates[364].getTime());
    });

    it('is deterministic (same values across calls)', () => {
      expect(buildDemoSeries().portfolioValues).toEqual(
        buildDemoSeries().portfolioValues
      );
    });

    it('keeps profit consistent with value minus invested', () => {
      const s = buildDemoSeries();
      const last = s.portfolioValues.length - 1;
      expect(s.profit[last]).toBeCloseTo(
        s.portfolioValues[last] - s.invested[last],
        2
      );
    });
  });

  describe('buildDemoSummary', () => {
    it('derives headline metrics from the series', () => {
      const s = buildDemoSeries();
      const summary = buildDemoSummary(s);
      expect(summary.portfolioValue).toBe(s.portfolioValues[s.portfolioValues.length - 1]);
      expect(summary.startDate).toEqual(s.dates[0]);
      expect(summary.totalReturn.absolute).toBeCloseTo(
        summary.portfolioValue - summary.totalInvested,
        2
      );
    });
  });

  describe('hand-tuned chart data', () => {
    it('annual returns align years/yields/profit', () => {
      const a = buildDemoAnnualReturns();
      expect(a.years).toHaveLength(4);
      expect(a.yields).toHaveLength(4);
      expect(a.profit).toHaveLength(4);
    });

    it('quarterly dividends have 4 quarters per year', () => {
      const q = buildDemoQuarterlyDividends();
      expect(q.length).toBeGreaterThan(0);
      q.forEach((row) => expect(row.data).toHaveLength(4));
    });

    it('ttm dividends align yearQuarters and values', () => {
      const t = buildDemoTtmDividends();
      expect(t.yearQuarters).toHaveLength(8);
      expect(t.dividends).toHaveLength(8);
      t.yearQuarters.forEach((yq) => {
        expect(yq.quarter).toBeGreaterThanOrEqual(0);
        expect(yq.quarter).toBeLessThanOrEqual(3);
      });
    });
  });
});
