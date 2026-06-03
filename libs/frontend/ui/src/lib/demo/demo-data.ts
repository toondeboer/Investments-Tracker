import { Summary, YearQuarter } from '@aws/util';

/**
 * Static, deterministic sample data for the public landing/demo experience.
 *
 * Nothing here touches the backend, NgRx or Yahoo — it is a self-contained,
 * seeded generator so the hero chart and the `/demo` mini-dashboard tell the
 * same consistent story every render. Values are seeded (reproducible); dates
 * are anchored to "today" so the demo always looks current.
 */

export interface DemoSeries {
  dates: Date[];
  /** Daily portfolio market value. */
  portfolioValues: number[];
  /** Cumulative amount invested (contributions). */
  invested: number[];
  /** portfolioValues − invested. */
  profit: number[];
  /** Cumulative dividends received. */
  cumulativeDividend: number[];
  /** Cumulative commission paid. */
  cumulativeCommission: number[];
}

const DAYS = 365;
const START_VALUE = 18000;
const CONTRIBUTION = 600;
const CONTRIBUTION_EVERY = 30;
const SEED = 0x5a170c; // "sailor"-ish

/** Small, fast seeded PRNG so the demo is reproducible across renders. */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function midnight(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

const round2 = (n: number) => Math.round(n * 100) / 100;

/** Build the daily portfolio time series (oldest → newest, ending today). */
export function buildDemoSeries(): DemoSeries {
  const rng = mulberry32(SEED);
  const today = midnight(new Date());

  const dates: Date[] = [];
  const portfolioValues: number[] = [];
  const invested: number[] = [];
  const profit: number[] = [];
  const cumulativeDividend: number[] = [];
  const cumulativeCommission: number[] = [];

  let value = START_VALUE;
  let investedAmount = START_VALUE;
  let dividends = 0;
  let commission = 0;

  for (let i = 0; i < DAYS; i++) {
    const date = new Date(today);
    date.setDate(today.getDate() - (DAYS - 1 - i));

    // Upward drift (~+18%/yr) with mild daily noise (±1%).
    const drift = 0.00065;
    const noise = (rng() - 0.5) * 0.02;
    value *= 1 + drift + noise;

    // Periodic contributions: lift both market value and invested amount.
    if (i > 0 && i % CONTRIBUTION_EVERY === 0) {
      value += CONTRIBUTION;
      investedAmount += CONTRIBUTION;
      commission += 2; // flat broker fee per buy
    }

    // Quarterly dividend drips.
    if (i > 0 && i % 91 === 0) {
      dividends += 70 + rng() * 60;
    }

    dates.push(date);
    portfolioValues.push(round2(value));
    invested.push(round2(investedAmount));
    profit.push(round2(value - investedAmount));
    cumulativeDividend.push(round2(dividends));
    cumulativeCommission.push(round2(commission));
  }

  return {
    dates,
    portfolioValues,
    invested,
    profit,
    cumulativeDividend,
    cumulativeCommission,
  };
}

/** Headline metrics derived from the generated series, for the hero stat cards. */
export function buildDemoSummary(series: DemoSeries = buildDemoSeries()): Summary {
  const last = series.portfolioValues.length - 1;
  const portfolioValue = series.portfolioValues[last];
  const totalInvested = series.invested[last];
  const totalDividend = series.cumulativeDividend[last];
  const totalCommission = series.cumulativeCommission[last];
  const absolute = portfolioValue - totalInvested;
  const percentage = totalInvested ? (absolute / totalInvested) * 100 : 0;

  const ret = (days: number) => {
    const prev = series.portfolioValues[Math.max(0, last - days)];
    const abs = portfolioValue - prev;
    return { absolute: round2(abs), percentage: round2(prev ? (abs / prev) * 100 : 0) };
  };

  return {
    portfolioValue: round2(portfolioValue),
    totalInvested: round2(totalInvested),
    totalDividend: round2(totalDividend),
    totalCommission: round2(totalCommission),
    startDate: series.dates[0],
    dailyReturn: ret(1),
    weeklyReturn: ret(7),
    monthlyReturn: ret(30),
    totalReturn: { absolute: round2(absolute), percentage: round2(percentage) },
  };
}

/** Recent calendar years (oldest → newest) ending in the current year. */
function recentYears(count: number): string[] {
  const end = new Date().getFullYear();
  return Array.from({ length: count }, (_, i) => String(end - (count - 1) + i));
}

/** Hand-tuned annual return figures for the bar+line "Annual Return" chart. */
export function buildDemoAnnualReturns(): {
  years: string[];
  yields: number[];
  profit: number[];
} {
  const years = recentYears(4);
  return {
    years,
    yields: [8.4, -3.1, 14.7, 18.2],
    profit: [1180, -520, 2640, 3910],
  };
}

/** Hand-tuned quarterly dividends for the last two years. */
export function buildDemoQuarterlyDividends(): { year: string; data: number[] }[] {
  const [, , prev, curr] = recentYears(4);
  return [
    { year: prev, data: [48, 55, 61, 67] },
    { year: curr, data: [70, 78, 85, 92] },
  ];
}

/** Hand-tuned trailing-twelve-month dividend series (last 8 quarters). */
export function buildDemoTtmDividends(): {
  yearQuarters: YearQuarter[];
  dividends: number[];
} {
  const today = new Date();
  const currentQuarter = Math.floor(today.getMonth() / 3);
  const yearQuarters: YearQuarter[] = [];
  const dividends: number[] = [];
  const base = 210;

  for (let i = 7; i >= 0; i--) {
    let quarter = currentQuarter - i;
    let year = today.getFullYear();
    while (quarter < 0) {
      quarter += 4;
      year -= 1;
    }
    yearQuarters.push({ year: String(year), quarter });
    dividends.push(round2(base + (7 - i) * 28));
  }

  return { yearQuarters, dividends };
}
