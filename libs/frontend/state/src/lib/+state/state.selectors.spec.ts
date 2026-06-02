import {
  selectAllPortfolioStates,
  selectState,
  selectVisiblePortfoliosDbo,
} from './state.selectors';
import { PortfolioDbo } from '@aws/util';

describe('state selectors', () => {
  const portfolios: PortfolioDbo[] = [
    {
      id: 'p1',
      name: 'One',
      transactions: {
        stock: [{ ticker: 'VUSA.AS', type: 'stock', date: '2023-01-10', amount: 2, value: 200, currency: 'EUR' }],
        dividend: [],
        commission: [],
      },
    },
    {
      id: 'p2',
      name: 'Two',
      transactions: { stock: [], dividend: [], commission: [] },
    },
  ];

  describe('selectVisiblePortfoliosDbo', () => {
    it('returns all portfolios when selection is "all"', () => {
      expect(selectVisiblePortfoliosDbo.projector(portfolios, 'all')).toHaveLength(2);
    });

    it('filters to the selected ids', () => {
      const result = selectVisiblePortfoliosDbo.projector(portfolios, ['p2']);
      expect(result.map((p) => p.id)).toEqual(['p2']);
    });
  });

  describe('selectState', () => {
    const aggregate = {
      portfolio: {
        transactions: { stock: [], dividend: [], commission: [] },
        stocks: {},
        dates: [],
        summary: {} as any,
        currencies: [],
      },
      fxError: null as string | null,
    };

    it('merges portfolio with loading and error', () => {
      const vm = selectState.projector(aggregate, true, null);
      expect(vm.loading).toBe(true);
      expect(vm.error).toBeNull();
      expect(vm.stocks).toEqual({});
    });

    it('surfaces fxError when there is no hard error', () => {
      const vm = selectState.projector({ ...aggregate, fxError: 'FX failed' }, false, null);
      expect(vm.error).toBe('FX failed');
    });

    it('prefers a hard error over fxError', () => {
      const vm = selectState.projector({ ...aggregate, fxError: 'FX failed' }, false, 'Network down');
      expect(vm.error).toBe('Network down');
    });
  });

  describe('selectAllPortfolioStates', () => {
    it('returns a state keyed by portfolio id', () => {
      const result = selectAllPortfolioStates.projector(portfolios, {}, 'EUR');
      expect(Object.keys(result).sort()).toEqual(['p1', 'p2']);
      expect(result['p1'].portfolioName).toBe('One');
      expect(result['p1'].summary.totalInvested).toBe(200);
    });
  });
});
