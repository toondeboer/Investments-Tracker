import { TransactionsDbo } from './types';

export type YahooCsvRow = {
  Symbol: string;
  'Trade Date': string; // YYYYMMDD
  'Purchase Price': string;
  Quantity: string;
  Commission: string;
  'Transaction Type': string; // 'BUY' | 'SHORT' (SHORT = SELL)
};

function parseTradeDate(raw: string): string {
  // YYYYMMDD → YYYY-MM-DD
  const s = raw.trim();
  if (s.length !== 8) {
    throw new Error(`Unrecognised Trade Date format: "${raw}"`);
  }
  return `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}`;
}

/**
 * Parses a Yahoo Finance portfolio CSV export into TransactionsDbo.
 *
 * Column mapping:
 *   Symbol          → ticker (already a Yahoo Finance symbol)
 *   Trade Date      → date (YYYYMMDD → YYYY-MM-DD)
 *   Purchase Price  → price per share
 *   Quantity        → number of shares
 *   Commission      → commission value (if non-zero, stored as a commission entry)
 *   Transaction Type:
 *     BUY   → positive stock transaction
 *     SHORT → SELL (negative amount / value represents reducing position)
 *
 * Note: currency is NOT in the CSV. The caller must fetch it from the Yahoo API
 * after parsing and fill in the currency field on each transaction.
 * A placeholder value of 'UNKNOWN' is used until the caller resolves it.
 */
export function parseYahooCsvInput(rawRows: unknown[]): TransactionsDbo {
  const stock = [];
  const dividend: never[] = [];
  const commission = [];

  for (const rawRow of rawRows) {
    const row = rawRow as YahooCsvRow;

    const symbol = (row['Symbol'] ?? '').trim();
    const tradeDateRaw = (row['Trade Date'] ?? '').trim();
    const purchasePriceRaw = (row['Purchase Price'] ?? '').trim();
    const quantityRaw = (row['Quantity'] ?? '').trim();
    const commissionRaw = (row['Commission'] ?? '').trim();
    const txType = (row['Transaction Type'] ?? '').trim().toUpperCase();

    if (
      !symbol ||
      !tradeDateRaw ||
      !purchasePriceRaw ||
      !quantityRaw ||
      !txType
    ) {
      continue;
    }

    const date = parseTradeDate(tradeDateRaw);
    const purchasePrice = parseFloat(purchasePriceRaw);
    const quantity = parseFloat(quantityRaw);

    if (isNaN(purchasePrice) || isNaN(quantity)) continue;

    const isBuy = txType === 'BUY';
    const isSell = txType === 'SHORT';

    if (isBuy || isSell) {
      // Signed convention: a buy adds shares and cost (positive amount/value),
      // a sell removes shares and recovers cash (negative amount/value). Cost
      // basis is the running sum of these values, so a sell must reduce it —
      // otherwise selling inflates "invested" and profit goes wrong, most
      // visibly once a position is fully sold.
      const magnitude = Math.abs(purchasePrice * quantity);
      const amount = isBuy ? quantity : -quantity;
      const value = isBuy ? magnitude : -magnitude;
      stock.push({
        ticker: symbol,
        type: 'stock',
        date,
        amount,
        value,
        currency: 'UNKNOWN', // Caller must resolve via Yahoo API
      });
    }

    const commissionValue = commissionRaw ? parseFloat(commissionRaw) : 0;
    if (commissionValue > 0) {
      commission.push({
        ticker: symbol,
        type: 'commission',
        date,
        amount: 1,
        value: commissionValue,
        currency: 'UNKNOWN',
      });
    }
  }

  return { stock, dividend, commission };
}
