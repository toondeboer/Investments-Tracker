import { createFxConverter } from './fx';
import { Ticker, Transaction } from './types';

function makeTicker(name: string, dates: string[], values: number[]): Ticker {
  return {
    name,
    currency: 'EUR',
    dates: dates.map((d) => new Date(d)),
    values,
    dividends: [],
  };
}

function tx(date: string, value: number, amount: number): Transaction {
  return {
    ticker: 'ACME',
    type: 'stock',
    date: new Date(date),
    amount,
    value,
    currency: 'USD',
  };
}

describe('createFxConverter', () => {
  // USD -> EUR uses the EUR=X ticker (no sub-unit multiplier).
  const usdEur = (
    values: number[],
    dates = ['2023-01-10', '2023-01-11', '2023-01-13'],
  ) => ({
    'EUR=X': makeTicker('EUR=X', dates, values),
  });

  describe('returns null (no conversion)', () => {
    it('when no display currency is given', () => {
      expect(
        createFxConverter('USD', undefined, usdEur([0.9, 0.95, 1.0])),
      ).toBeNull();
    });

    it('when stock and display currency are the same', () => {
      expect(
        createFxConverter('EUR', 'EUR', usdEur([0.9, 0.95, 1.0])),
      ).toBeNull();
    });

    it('when the currency pair is unsupported', () => {
      expect(
        createFxConverter('JPY', 'EUR', usdEur([0.9, 0.95, 1.0])),
      ).toBeNull();
    });

    it('when the required FX ticker has not loaded yet', () => {
      expect(createFxConverter('USD', 'EUR', {})).toBeNull();
    });
  });

  describe('convert (spot-at-purchase)', () => {
    it('uses the rate on the transaction date', () => {
      const fx = createFxConverter('USD', 'EUR', usdEur([0.9, 0.95, 1.0]))!;
      expect(fx.convert(100, new Date('2023-01-10'))).toBeCloseTo(90);
    });

    it('forward-fills the last known rate on a gap day', () => {
      const fx = createFxConverter('USD', 'EUR', usdEur([0.9, 0.95, 1.0]))!;
      // 2023-01-12 has no entry -> carries 2023-01-11's rate.
      expect(fx.convert(100, new Date('2023-01-12'))).toBeCloseTo(95);
    });

    it('backward-fills when the date precedes all FX data', () => {
      const fx = createFxConverter('USD', 'EUR', usdEur([0.9, 0.95, 1.0]))!;
      expect(fx.convert(100, new Date('2023-01-01'))).toBeCloseTo(90);
    });

    it('treats zero rates as missing', () => {
      // 2023-01-10 rate is 0 (Yahoo gap) -> falls back to the first valid rate.
      const fx = createFxConverter('USD', 'EUR', usdEur([0, 0.95, 1.0]))!;
      expect(fx.convert(100, new Date('2023-01-10'))).toBeCloseTo(95);
    });
  });

  describe('multiplier (GBp pence)', () => {
    const gbpEur = {
      'GBPEUR=X': makeTicker('GBPEUR=X', ['2023-01-10'], [1.15]),
    };

    it('applies the 0.01 sub-unit multiplier on convert', () => {
      const fx = createFxConverter('GBp', 'EUR', gbpEur)!;
      expect(fx.multiplier).toBe(0.01);
      expect(fx.convert(1000, new Date('2023-01-10'))).toBeCloseTo(
        1000 * 1.15 * 0.01,
      );
    });

    it('applies the multiplier to scaled rates', () => {
      const fx = createFxConverter('GBp', 'EUR', gbpEur)!;
      expect(fx.getScaledRates([new Date('2023-01-10')])).toEqual([
        1.15 * 0.01,
      ]);
    });
  });

  describe('getScaledRates (per-date market rate)', () => {
    it('aligns rates to the given dates with forward fill', () => {
      const fx = createFxConverter('USD', 'EUR', usdEur([0.9, 0.95, 1.0]))!;
      const rates = fx.getScaledRates([
        new Date('2023-01-10'),
        new Date('2023-01-12'), // gap -> 0.95
        new Date('2023-01-13'),
      ]);
      expect(rates).toEqual([0.9, 0.95, 1.0]);
    });

    it('backward-fills dates before the first rate', () => {
      const fx = createFxConverter('USD', 'EUR', usdEur([0.9, 0.95, 1.0]))!;
      const rates = fx.getScaledRates([
        new Date('2023-01-01'),
        new Date('2023-01-10'),
      ]);
      expect(rates).toEqual([0.9, 0.9]);
    });
  });

  describe('convertTransactions', () => {
    it('scales each value at its own date and leaves amounts untouched', () => {
      const fx = createFxConverter('USD', 'EUR', usdEur([0.9, 0.95, 1.0]))!;
      const converted = fx.convertTransactions([
        tx('2023-01-10', 100, 2),
        tx('2023-01-13', 200, 3),
      ]);
      expect(converted[0].value).toBeCloseTo(90);
      expect(converted[0].amount).toBe(2);
      expect(converted[1].value).toBeCloseTo(200);
      expect(converted[1].amount).toBe(3);
    });
  });

  describe('throws when FX data is unusable', () => {
    it('getScaledRates throws when the ticker has no valid values', () => {
      const fx = createFxConverter('USD', 'EUR', usdEur([0, 0, 0]))!;
      expect(() => fx.getScaledRates([new Date('2023-01-10')])).toThrow(
        /No FX rate data/,
      );
    });

    it('convert throws when the ticker has no valid values', () => {
      const fx = createFxConverter('USD', 'EUR', usdEur([0, 0, 0]))!;
      expect(() => fx.convert(100, new Date('2023-01-10'))).toThrow(
        /No FX rate data/,
      );
    });
  });
});
