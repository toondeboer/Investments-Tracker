import { Ticker, TransactionsDbo } from '../types';

/**
 * Golden regression fixture for computePortfolioState.
 *
 * Design goals (so the expected numbers are hand-verifiable and stable):
 *  - **Flat share prices** per stock, so the most-recent portfolio value is
 *    `shares * price` regardless of how many chart dates "today" produces.
 *  - **Three currencies** (EUR / USD / GBp) to exercise every FX branch.
 *  - **A step-function USD→EUR rate** (0.90 before the cutover, 1.00 after) so
 *    the difference between "convert cost basis at today's spot" (current
 *    behaviour) and "convert each purchase at its transaction-date rate"
 *    (the spot-at-purchase change) is a concrete, documented number.
 *  - **No missing prices and no exact-zero profit**, so the known numeric-edge
 *    bugs (handled separately in unit tests) do not contaminate the golden
 *    values — these expectations represent *correct* output.
 *
 * The clock must be pinned to GOLDEN_NOW in the spec (jest fake timers) so the
 * date-dependent structures (chart date arrays, the 30-day return window) are
 * deterministic.
 */

// Pinned "today" for the golden spec. A Monday, well after every transaction
// and after the FX cutover, so the most-recent FX rate is unambiguously 1.00.
export const GOLDEN_NOW = new Date('2024-06-03T12:00:00.000Z');

// USD→EUR (EUR=X) cutover: 0.90 strictly before this date, 1.00 on/after.
const FX_CUTOVER = new Date('2023-07-01T00:00:00.000Z');

export const goldenDbo: TransactionsDbo = {
  stock: [
    // VUSA.AS — EUR (no FX). Two buys: 2@100 then 1@120 -> 3 shares, €320 cost.
    {
      ticker: 'VUSA.AS',
      type: 'stock',
      date: '2023-01-10',
      amount: 2,
      value: 200,
      currency: 'EUR',
    },
    {
      ticker: 'VUSA.AS',
      type: 'stock',
      date: '2023-07-10',
      amount: 1,
      value: 120,
      currency: 'EUR',
    },
    // AAPL — USD. Buy 4@100 BEFORE the FX cutover, 2@110 AFTER -> 6 shares, $620 cost.
    {
      ticker: 'AAPL',
      type: 'stock',
      date: '2023-03-01',
      amount: 4,
      value: 400,
      currency: 'USD',
    },
    {
      ticker: 'AAPL',
      type: 'stock',
      date: '2023-09-01',
      amount: 2,
      value: 220,
      currency: 'USD',
    },
    // LLOY.L — GBp (pence). Buy 100 shares for 5000 pence (£50). Flat FX 1.15.
    {
      ticker: 'LLOY.L',
      type: 'stock',
      date: '2023-05-01',
      amount: 100,
      value: 5000,
      currency: 'GBp',
    },
  ],
  dividend: [
    {
      ticker: 'VUSA.AS',
      type: 'dividend',
      date: '2023-04-15',
      amount: 0,
      value: 5,
      currency: 'EUR',
    },
    {
      ticker: 'VUSA.AS',
      type: 'dividend',
      date: '2024-01-15',
      amount: 0,
      value: 6,
      currency: 'EUR',
    },
    // AAPL dividend is AFTER the FX cutover, so its rate is 1.00 under both
    // conversion schemes — keeps the dividend total stable across phases.
    {
      ticker: 'AAPL',
      type: 'dividend',
      date: '2023-12-01',
      amount: 0,
      value: 8,
      currency: 'USD',
    },
  ],
  commission: [
    {
      ticker: 'VUSA.AS',
      type: 'commission',
      date: '2023-01-10',
      amount: 0,
      value: 3,
      currency: 'EUR',
    },
    {
      ticker: 'VUSA.AS',
      type: 'commission',
      date: '2023-07-10',
      amount: 0,
      value: 2,
      currency: 'EUR',
    },
    // AAPL commission: 1 USD before the cutover, 1 USD after.
    {
      ticker: 'AAPL',
      type: 'commission',
      date: '2023-03-01',
      amount: 0,
      value: 1,
      currency: 'USD',
    },
    {
      ticker: 'AAPL',
      type: 'commission',
      date: '2023-09-01',
      amount: 0,
      value: 1,
      currency: 'USD',
    },
    {
      ticker: 'LLOY.L',
      type: 'commission',
      date: '2023-05-01',
      amount: 0,
      value: 400,
      currency: 'GBp',
    },
  ],
};

/**
 * Builds a flat-price ticker spanning the whole history up to GOLDEN_NOW, with
 * one entry per calendar day so that exact-date matches always exist.
 */
function flatTicker(
  name: string,
  currency: string,
  price: number,
  start: Date,
): Ticker {
  const dates: Date[] = [];
  const values: number[] = [];
  const cursor = new Date(start);
  while (cursor <= GOLDEN_NOW) {
    dates.push(new Date(cursor));
    values.push(price);
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return { name, currency, dates, values, dividends: [] };
}

/** USD→EUR step-function FX ticker: 0.90 before cutover, 1.00 on/after. */
function stepFxTicker(name: string, start: Date): Ticker {
  const dates: Date[] = [];
  const values: number[] = [];
  const cursor = new Date(start);
  while (cursor <= GOLDEN_NOW) {
    dates.push(new Date(cursor));
    values.push(cursor < FX_CUTOVER ? 0.9 : 1.0);
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return { name, currency: 'EUR', dates, values, dividends: [] };
}

const HISTORY_START = new Date('2023-01-09T00:00:00.000Z');

const vusaTicker = flatTicker('VUSA.AS', 'EUR', 150, HISTORY_START);
const aaplTicker = flatTicker('AAPL', 'USD', 130, HISTORY_START);

// IMPORTANT: once price tickers are present, the dividend figures shown by the
// app are derived from these Yahoo dividend EVENTS (amount-per-share * shares
// held at the ex-date), NOT from the DBO `dividend` transactions — those only
// feed the no-prices Stage-1 view. So the dividend events below are what the
// golden summary asserts.
//   VUSA: €2/share on 2024-01-15, holding 3 shares -> €6 received.
//   AAPL: $1/share on 2023-12-01, holding 6 shares -> $6 received.
vusaTicker.dividends = [
  { date: new Date('2024-01-15T00:00:00.000Z'), amountPerShare: 2 },
];
aaplTicker.dividends = [
  { date: new Date('2023-12-01T00:00:00.000Z'), amountPerShare: 1 },
];

export const goldenTickers: { [ticker: string]: Ticker } = {
  // Flat prices: VUSA €150, AAPL $130, LLOY 60 pence.
  'VUSA.AS': vusaTicker,
  AAPL: aaplTicker,
  'LLOY.L': flatTicker('LLOY.L', 'GBp', 60, HISTORY_START),
  // FX pairs.
  'EUR=X': stepFxTicker('EUR=X', HISTORY_START), // USD -> EUR (step)
  'GBPEUR=X': flatTicker('GBPEUR=X', 'EUR', 1.15, HISTORY_START), // GBP -> EUR (flat)
  'EURUSD=X': flatTicker('EURUSD=X', 'USD', 1.1, HISTORY_START), // EUR -> USD (flat)
  'GBPUSD=X': flatTicker('GBPUSD=X', 'USD', 1.25, HISTORY_START), // GBP -> USD (flat)
};

/**
 * Hand-computed expected values. Market value always uses the current spot
 * rate; the only field that differs between conversion schemes is cost basis
 * (invested / commission), called out explicitly below.
 *
 * Dividends (ticker-event derived once prices load — see note above):
 *   VUSA: €2/share * 3 = €6 ; AAPL: $1/share * 6 = $6 ; LLOY: none
 *
 * Native (no display currency):
 *   VUSA: 3 * €150 = €450 value, €320 invested, €5 commission, €6 dividend
 *   AAPL: 6 * $130 = $780 value, $620 invested, $2 commission, $6 dividend
 *   LLOY: 100 * 60p = 6000p value, 5000p invested, 400p commission
 *
 * EUR display — market value (current spot, last rate 1.00 / GBp 0.01*1.15):
 *   VUSA €450 + AAPL ($780*1.00)=€780 + LLOY (6000p*0.01*1.15)=€69  => €1299
 *   dividend: €6 + ($6*1.00)=€6 + 0 => €12
 */
export const GOLDEN_EXPECTED = {
  native: {
    VUSA: {
      value: 450,
      invested: 320,
      commission: 5,
      dividend: 6,
      shares: 3,
      avgPrice: 320 / 3,
    },
    AAPL: {
      value: 780,
      invested: 620,
      commission: 2,
      dividend: 6,
      shares: 6,
      avgPrice: 620 / 6,
    },
    LLOY: {
      value: 6000,
      invested: 5000,
      commission: 400,
      dividend: 0,
      shares: 100,
      avgPrice: 50,
    },
  },
  eur: {
    portfolioValue: 1299,
    totalDividend: 12,
    // Current behaviour (cost basis at today's spot rate):
    //   invested  = 320 + (620*1.00) + (5000*0.01*1.15=57.5) = 997.5
    //   commission= 5   + (2*1.00)   + (400*0.01*1.15=4.6)    = 11.6
    currentSpot: { totalInvested: 997.5, totalCommission: 11.6 },
    // Spot-at-purchase (Phase 3 target):
    //   AAPL invested = 400*0.90 + 220*1.00 = 580 ; commission = 1*0.90 + 1*1.00 = 1.90
    //   invested  = 320 + 580 + 57.5 = 957.5
    //   commission= 5   + 1.9 + 4.6  = 11.5
    spotAtPurchase: { totalInvested: 957.5, totalCommission: 11.5 },
  },
  // USD display — all FX pairs here are flat, so these values are identical
  // under both conversion schemes (no step-function rate is involved).
  //   VUSA (EUR->USD 1.10): value 450*1.10=495, invested 320*1.10=352, comm 5*1.10=5.5, div 6*1.10=6.6
  //   AAPL (USD, no FX):    value 780,            invested 620,         comm 2,           div 6
  //   LLOY (GBp->USD 1.25): value 6000*0.0125=75, invested 5000*0.0125=62.5, comm 400*0.0125=5
  usd: {
    portfolioValue: 495 + 780 + 75, // 1350
    totalInvested: 352 + 620 + 62.5, // 1034.5
    totalCommission: 5.5 + 2 + 5, // 12.5
    totalDividend: 6.6 + 6, // 12.6
  },
};
