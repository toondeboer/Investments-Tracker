import { CsvInput, Transaction } from './types';
import { parseCsvInput } from './util';
//file.only
describe('parseCsvInput', () => {
  it.each`
    Datum           | Omschrijving             | n
    ${'03-10-2023'} | ${'Koop 6 @ 77,177 EUR'} | ${'-463.06'}
  `('should work', ({ Datum, Omschrijving, n }) => {
    const csv: CsvInput = [
      {
        Datum,
        Omschrijving,
        '': n,
      },
    ];
    const expected: Transaction[] = [
      {
        type: 'buy',
        date: new Date(2023, 9, 3),
        amount: 6,
        value: 463.06,
      },
    ];
    expect(parseCsvInput(csv)).toEqual(expected);
  });
});
