import { CaptainSummary } from './captain.types';
import {
  insightFingerprint,
  readCachedInsight,
  writeCachedInsight,
} from './insights-cache';

const summary = (
  value: number,
  holdings: { ticker: string; value: number }[],
): CaptainSummary =>
  ({
    currency: 'EUR',
    asOf: '2026-06-03',
    portfolio: { value } as CaptainSummary['portfolio'],
    holdings: holdings.map((h) => ({
      ...h,
      allocationPct: 0,
      shares: 0,
      weeklyReturnPct: 0,
      monthlyReturnPct: 0,
      totalReturnPct: 0,
    })),
    notableMovers: [],
  }) as CaptainSummary;

describe('insightFingerprint', () => {
  it('is stable for the same portfolio on the same day', () => {
    const s = summary(1000, [{ ticker: 'AAA', value: 700 }]);
    expect(insightFingerprint(s)).toBe(insightFingerprint(s));
  });

  it('changes when a holding value changes', () => {
    const a = insightFingerprint(
      summary(1000, [{ ticker: 'AAA', value: 700 }]),
    );
    const b = insightFingerprint(
      summary(1000, [{ ticker: 'AAA', value: 750 }]),
    );
    expect(a).not.toBe(b);
  });
});

describe('insight cache', () => {
  beforeEach(() => localStorage.clear());

  it('round-trips an insight through localStorage', () => {
    const insight = {
      narrative: 'calm seas',
      generatedAt: '2026-06-03T00:00:00Z',
      fingerprint: 'fp',
    };
    writeCachedInsight(insight);
    expect(readCachedInsight()).toEqual(insight);
  });

  it('returns null when nothing is cached', () => {
    expect(readCachedInsight()).toBeNull();
  });

  it('returns null on corrupt cache data', () => {
    localStorage.setItem('captain.insight', '{not json');
    expect(readCachedInsight()).toBeNull();
  });
});
