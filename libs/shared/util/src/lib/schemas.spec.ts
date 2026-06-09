import { parseDatabaseDto, parseYahooObjects } from './schemas';

// parseYahooObjects warns on skipped entries; keep test output clean.
beforeAll(() => {
  jest.spyOn(console, 'warn').mockImplementation(() => undefined);
});
afterAll(() => jest.restoreAllMocks());

const validTransaction = {
  ticker: 'VUSA.AS',
  type: 'stock',
  date: '2023-01-10',
  amount: 2,
  value: 200,
  currency: 'EUR',
};

const validTransactionsDbo = {
  stock: [validTransaction],
  dividend: [],
  commission: [],
};

describe('parseDatabaseDto', () => {
  describe('v2 input', () => {
    const validV2 = {
      schemaVersion: 2,
      settings: { baseCurrency: 'EUR' },
      portfolios: [
        { id: 'p1', name: 'My Portfolio', transactions: validTransactionsDbo },
      ],
    };

    it('accepts a well-formed v2 response', () => {
      const result = parseDatabaseDto(validV2);
      expect(result.schemaVersion).toBe(2);
      expect(result.portfolios).toHaveLength(1);
      expect(result.portfolios[0].transactions.stock).toHaveLength(1);
      expect(result.settings.baseCurrency).toBe('EUR');
    });

    it('transaction time field is optional', () => {
      const withTime = {
        ...validV2,
        portfolios: [
          {
            id: 'p1',
            name: 'My Portfolio',
            transactions: {
              stock: [{ ...validTransaction, time: '14:32' }],
              dividend: [],
              commission: [],
            },
          },
        ],
      };
      const result = parseDatabaseDto(withTime);
      expect(result.portfolios[0].transactions.stock[0].time).toBe('14:32');
    });

    it('throws when a numeric field is the wrong type', () => {
      expect(() =>
        parseDatabaseDto({
          ...validV2,
          portfolios: [
            {
              id: 'p1',
              name: 'My Portfolio',
              transactions: {
                stock: [{ ...validTransaction, value: 'not-a-number' }],
                dividend: [],
                commission: [],
              },
            },
          ],
        }),
      ).toThrow();
    });
  });

  describe('v1 migration', () => {
    const validV1 = { transactions: validTransactionsDbo };

    it('migrates v1 to v2 wrapping transactions in Default portfolio', () => {
      const result = parseDatabaseDto(validV1);
      expect(result.schemaVersion).toBe(2);
      expect(result.portfolios).toHaveLength(1);
      expect(result.portfolios[0].name).toBe('Default');
      expect(result.portfolios[0].id).toBe('default');
      expect(result.portfolios[0].transactions.stock).toHaveLength(1);
      expect(result.settings.baseCurrency).toBe('EUR');
    });

    it('migrates v1 with extra fields without error', () => {
      const result = parseDatabaseDto({
        ...validV1,
        startDate: '2023-01-01',
        extraneous: 'ignored',
      });
      expect(result.schemaVersion).toBe(2);
    });
  });

  describe('empty / null input', () => {
    it('returns empty v2 for null', () => {
      const result = parseDatabaseDto(null);
      expect(result.schemaVersion).toBe(2);
      expect(result.portfolios).toHaveLength(1);
      expect(result.portfolios[0].transactions.stock).toHaveLength(0);
    });

    it('returns empty v2 for empty object', () => {
      const result = parseDatabaseDto({});
      expect(result.schemaVersion).toBe(2);
    });
  });
});

describe('parseYahooObjects', () => {
  function validYahoo(symbol = 'VUSA.AS') {
    return {
      symbol,
      data: {
        chart: {
          result: [
            {
              meta: { currency: 'EUR', symbol },
              timestamp: [1696550400],
              indicators: { quote: [{ close: [100, null] }] },
            },
          ],
        },
      },
    };
  }

  it('returns valid entries unchanged', () => {
    const result = parseYahooObjects([validYahoo(), validYahoo('EUR=X')]);
    expect(result).toHaveLength(2);
    expect(result[0].symbol).toBe('VUSA.AS');
  });

  it('skips malformed / error entries instead of crashing the batch', () => {
    const result = parseYahooObjects([
      validYahoo(),
      { symbol: 'BAD', error: 'Failed to fetch' }, // Yahoo error entry
      { totally: 'wrong' },
    ]);
    expect(result).toHaveLength(1);
    expect(result[0].symbol).toBe('VUSA.AS');
  });

  it('throws when the payload is not an array', () => {
    expect(() => parseYahooObjects({ not: 'an array' })).toThrow();
  });
});
