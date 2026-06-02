import { parseYahooCsvInput } from './yahoo-csv-import';

describe('parseYahooCsvInput', () => {
  const row = (overrides: Record<string, string>) => ({
    Symbol: 'AAPL',
    'Trade Date': '20230110',
    'Purchase Price': '100',
    Quantity: '10',
    Commission: '0',
    'Transaction Type': 'BUY',
    ...overrides,
  });

  it('records a BUY with positive amount and value', () => {
    const { stock } = parseYahooCsvInput([row({})]);
    expect(stock).toHaveLength(1);
    expect(stock[0].amount).toBe(10);
    expect(stock[0].value).toBe(1000);
  });

  it('records a SELL (SHORT) with negative amount AND negative value', () => {
    // The signed convention: a sell reduces the running cost basis. A positive
    // value here would inflate "invested" and break profit once shares are sold.
    const { stock } = parseYahooCsvInput([
      row({ 'Transaction Type': 'SHORT', 'Purchase Price': '120', Quantity: '10' }),
    ]);
    expect(stock).toHaveLength(1);
    expect(stock[0].amount).toBe(-10);
    expect(stock[0].value).toBe(-1200);
  });

  it('a buy then full sell nets the cost basis to (cost - proceeds)', () => {
    const { stock } = parseYahooCsvInput([
      row({ 'Transaction Type': 'BUY', 'Purchase Price': '100', Quantity: '10' }),
      row({ 'Transaction Type': 'SHORT', 'Purchase Price': '120', Quantity: '10', 'Trade Date': '20230610' }),
    ]);
    const netInvested = stock.reduce((s, tx) => s + tx.value, 0);
    const netShares = stock.reduce((s, tx) => s + tx.amount, 0);
    expect(netShares).toBe(0); // fully sold
    expect(netInvested).toBe(-200); // €1000 cost - €1200 proceeds
  });
});
