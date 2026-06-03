import { PortfolioState, Return } from '@aws/util';
import { CaptainHolding, CaptainSummary } from './captain.types';

const round2 = (n: number): number =>
  Number.isFinite(n) ? Math.round(n * 100) / 100 : 0;

const roundReturn = (r: Return): Return => ({
  absolute: round2(r.absolute),
  percentage: round2(r.percentage),
});

// A holding whose 1-week move is at least this large (either direction) is
// flagged "notable" — the deterministic seed for the insight narrative.
const NOTABLE_WEEKLY_PCT = 5;
const MAX_NOTABLE_MOVERS = 3;

/**
 * Rank holdings by the size of their one-week move (largest first) and flag the
 * ones past {@link NOTABLE_WEEKLY_PCT}. Pure and deterministic so the "biggest
 * movers / unexpected rises and drops" come from code, not the model.
 */
export function detectMovers(
  holdings: CaptainHolding[]
): { ticker: string; weeklyReturnPct: number; notable: boolean }[] {
  return [...holdings]
    .sort((a, b) => Math.abs(b.weeklyReturnPct) - Math.abs(a.weeklyReturnPct))
    .slice(0, MAX_NOTABLE_MOVERS)
    .map((h) => ({
      ticker: h.ticker,
      weeklyReturnPct: h.weeklyReturnPct,
      notable: Math.abs(h.weeklyReturnPct) >= NOTABLE_WEEKLY_PCT,
    }));
}

/**
 * Flatten the computed portfolio view-model (as returned by `selectState`) into
 * the compact {@link CaptainSummary} sent to the Captain Lambda.
 */
export function buildCaptainSummary(
  state: PortfolioState,
  currency: string
): CaptainSummary {
  const { summary, stocks } = state;
  const totalValue = summary.portfolioValue;

  const holdings: CaptainHolding[] = Object.values(stocks).map((stock) => {
    const s = stock.summary;
    return {
      ticker: stock.ticker,
      value: round2(s.portfolioValue),
      allocationPct:
        totalValue > 0 ? round2((s.portfolioValue / totalValue) * 100) : 0,
      shares: round2(s.amountOfShares),
      weeklyReturnPct: round2(s.weeklyReturn.percentage),
      monthlyReturnPct: round2(s.monthlyReturn.percentage),
      totalReturnPct: round2(s.totalReturn.percentage),
    };
  });

  return {
    currency,
    asOf: new Date().toISOString().slice(0, 10),
    portfolio: {
      value: round2(summary.portfolioValue),
      invested: round2(summary.totalInvested),
      dividend: round2(summary.totalDividend),
      commission: round2(summary.totalCommission),
      dailyReturn: roundReturn(summary.dailyReturn),
      weeklyReturn: roundReturn(summary.weeklyReturn),
      monthlyReturn: roundReturn(summary.monthlyReturn),
      totalReturn: roundReturn(summary.totalReturn),
    },
    holdings,
    notableMovers: detectMovers(holdings),
  };
}
