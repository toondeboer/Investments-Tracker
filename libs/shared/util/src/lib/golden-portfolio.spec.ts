import { computePortfolioState } from './portfolio';
import {
  GOLDEN_EXPECTED,
  GOLDEN_NOW,
  goldenDbo,
  goldenTickers,
} from './__fixtures__/golden-portfolio';
import { TimeRange } from './types';

/**
 * Golden regression test: a realistic multi-currency portfolio whose expected
 * numbers are hand-computed in the fixture. This is the cross-phase anchor —
 * any phase that changes a number must update the fixture in the same commit
 * with the new arithmetic.
 *
 * The clock is pinned so the date-dependent structures are deterministic.
 */
describe('golden portfolio (characterization)', () => {
  beforeAll(() => {
    jest.useFakeTimers();
    jest.setSystemTime(GOLDEN_NOW);
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  const finite = (n: number) => Number.isFinite(n);

  describe('native (no display currency)', () => {
    const result = computePortfolioState(goldenDbo, goldenTickers);
    const { native } = GOLDEN_EXPECTED;

    it.each(Object.entries(native))('stock %s matches hand-computed values', (key, exp) => {
      const ticker = key === 'VUSA' ? 'VUSA.AS' : key === 'LLOY' ? 'LLOY.L' : 'AAPL';
      const s = result.stocks[ticker].summary;
      expect(s.portfolioValue).toBeCloseTo(exp.value);
      expect(s.totalInvested).toBeCloseTo(exp.invested);
      expect(s.totalCommission).toBeCloseTo(exp.commission);
      expect(s.totalDividend).toBeCloseTo(exp.dividend);
      expect(s.amountOfShares).toBe(exp.shares);
      expect(s.averageSharePrice).toBeCloseTo(exp.avgPrice);
    });
  });

  describe('EUR display', () => {
    const result = computePortfolioState(goldenDbo, goldenTickers, 'EUR');
    const { eur } = GOLDEN_EXPECTED;

    it('aggregate market value and dividend total', () => {
      expect(result.summary.portfolioValue).toBeCloseTo(eur.portfolioValue);
      expect(result.summary.totalDividend).toBeCloseTo(eur.totalDividend);
    });

    it('per-stock market value converts at the current spot rate', () => {
      expect(result.stocks['VUSA.AS'].summary.portfolioValue).toBeCloseTo(450);
      expect(result.stocks['AAPL'].summary.portfolioValue).toBeCloseTo(780);
      expect(result.stocks['LLOY.L'].summary.portfolioValue).toBeCloseTo(69);
    });

    it('cost basis uses the SPOT-AT-PURCHASE scheme (Phase 3)', () => {
      // Each purchase/commission is converted at its own transaction-date FX
      // rate (AAPL bought 4@$100 at 0.90 + 2@$110 at 1.00), so invested no
      // longer drifts with today's rate. See eur.spotAtPurchase in the fixture.
      expect(result.summary.totalInvested).toBeCloseTo(eur.spotAtPurchase.totalInvested);
      expect(result.summary.totalCommission).toBeCloseTo(eur.spotAtPurchase.totalCommission);
    });
  });

  describe('USD display', () => {
    const result = computePortfolioState(goldenDbo, goldenTickers, 'USD');
    const { usd } = GOLDEN_EXPECTED;

    it('aggregate values match (all FX pairs flat → scheme-independent)', () => {
      expect(result.summary.portfolioValue).toBeCloseTo(usd.portfolioValue);
      expect(result.summary.totalInvested).toBeCloseTo(usd.totalInvested);
      expect(result.summary.totalCommission).toBeCloseTo(usd.totalCommission);
      expect(result.summary.totalDividend).toBeCloseTo(usd.totalDividend);
    });
  });

  describe('structural invariants (all ranges / currencies)', () => {
    const ranges: TimeRange[] = ['1M', '1Y', '5Y', 'ALL'];
    const currencies: (string | undefined)[] = [undefined, 'EUR', 'USD'];

    it.each(ranges)('chart arrays align with the dates array (range %s)', (range) => {
      for (const cur of currencies) {
        const result = computePortfolioState(goldenDbo, goldenTickers, cur, range);
        const n = result.dates.length;
        expect(n).toBeGreaterThan(0);
        for (const ticker of Object.keys(result.stocks)) {
          const cd = result.stocks[ticker].chartData;
          expect(cd.portfolioValues).toHaveLength(n);
          expect(cd.profit).toHaveLength(n);
          expect(cd.stock.aggregatedValues).toHaveLength(n);
          expect(cd.commission.aggregatedValues).toHaveLength(n);
        }
      }
    });

    it.each(ranges)('no summary number is NaN or Infinity (range %s)', (range) => {
      for (const cur of currencies) {
        const { summary } = computePortfolioState(goldenDbo, goldenTickers, cur, range);
        expect(finite(summary.portfolioValue)).toBe(true);
        expect(finite(summary.totalInvested)).toBe(true);
        expect(finite(summary.totalCommission)).toBe(true);
        expect(finite(summary.totalDividend)).toBe(true);
        expect(finite(summary.totalReturn.absolute)).toBe(true);
        expect(finite(summary.totalReturn.percentage)).toBe(true);
        expect(finite(summary.dailyReturn.absolute)).toBe(true);
        expect(finite(summary.weeklyReturn.absolute)).toBe(true);
        expect(finite(summary.monthlyReturn.absolute)).toBe(true);
      }
    });
  });
});
