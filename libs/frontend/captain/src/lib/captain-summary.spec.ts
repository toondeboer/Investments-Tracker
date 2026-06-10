import { PortfolioState, Return, Stock, Summary } from '@aws/util';
import { buildCaptainSummary, detectMovers } from './captain-summary';
import { CaptainHolding } from './captain.types';

const ret = (absolute: number, percentage: number): Return => ({
  absolute,
  percentage,
});

function stock(ticker: string, overrides: Partial<Stock['summary']>): Stock {
  return {
    ticker,
    transactions: { stock: [], dividend: [], commission: [] },
    chartData: {} as Stock['chartData'],
    currency: { value: 'EUR' },
    summary: {
      portfolioValue: 0,
      totalInvested: 0,
      totalDividend: 0,
      totalCommission: 0,
      amountOfShares: 0,
      averageSharePrice: 0,
      currentSharePrice: 0,
      dailyReturn: ret(0, 0),
      weeklyReturn: ret(0, 0),
      monthlyReturn: ret(0, 0),
      totalReturn: ret(0, 0),
      ...overrides,
    },
  } as Stock;
}

const summary: Summary = {
  portfolioValue: 1000,
  totalInvested: 800,
  totalDividend: 25,
  totalCommission: 5,
  startDate: new Date('2024-01-01'),
  dailyReturn: ret(1.234, 0.123),
  weeklyReturn: ret(10, 1),
  monthlyReturn: ret(40, 4),
  totalReturn: ret(200, 25),
};

const state: PortfolioState = {
  transactions: { stock: [], dividend: [], commission: [] },
  dates: [],
  currencies: ['EUR'],
  summary,
  stocks: {
    AAA: stock('AAA', {
      portfolioValue: 700,
      amountOfShares: 7,
      weeklyReturn: ret(8, 1.2),
      monthlyReturn: ret(20, 3),
      totalReturn: ret(100, 16.5),
    }),
    BBB: stock('BBB', {
      portfolioValue: 300,
      amountOfShares: 30,
      weeklyReturn: ret(-20, -8.4),
      monthlyReturn: ret(-10, -3),
      totalReturn: ret(50, 9),
    }),
  },
};

describe('buildCaptainSummary', () => {
  it('flattens portfolio totals and rounds to 2 decimals', () => {
    const result = buildCaptainSummary(state, 'EUR');
    expect(result.currency).toBe('EUR');
    expect(result.portfolio.value).toBe(1000);
    expect(result.portfolio.dailyReturn).toEqual({
      absolute: 1.23,
      percentage: 0.12,
    });
    expect(result.holdings).toHaveLength(2);
  });

  it('computes allocation as a percentage of total value', () => {
    const result = buildCaptainSummary(state, 'EUR');
    const aaa = result.holdings.find((h) => h.ticker === 'AAA');
    expect(aaa?.allocationPct).toBe(70);
  });

  it('guards against divide-by-zero when total value is 0', () => {
    const empty = {
      ...state,
      summary: { ...summary, portfolioValue: 0 },
      stocks: { AAA: stock('AAA', { portfolioValue: 0 }) },
    };
    const result = buildCaptainSummary(empty, 'EUR');
    expect(result.holdings[0].allocationPct).toBe(0);
  });
});

describe('detectMovers', () => {
  const holdings: CaptainHolding[] = [
    {
      ticker: 'AAA',
      value: 700,
      allocationPct: 70,
      shares: 7,
      weeklyReturnPct: 1.2,
      monthlyReturnPct: 3,
      totalReturnPct: 16.5,
    },
    {
      ticker: 'BBB',
      value: 300,
      allocationPct: 30,
      shares: 30,
      weeklyReturnPct: -8.4,
      monthlyReturnPct: -3,
      totalReturnPct: 9,
    },
  ];

  it('ranks by the absolute size of the weekly move', () => {
    const movers = detectMovers(holdings);
    expect(movers[0].ticker).toBe('BBB');
  });

  it('flags moves of >= 5% as notable', () => {
    const movers = detectMovers(holdings);
    expect(movers.find((m) => m.ticker === 'BBB')?.notable).toBe(true);
    expect(movers.find((m) => m.ticker === 'AAA')?.notable).toBe(false);
  });
});
