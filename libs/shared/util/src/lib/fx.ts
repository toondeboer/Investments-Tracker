import { Ticker, Transaction } from './types';
import { getFxTickerForConversion } from './transactions';
import { isBeforeDay, isOnOrBeforeDay, isSameDay } from './core';

/**
 * Returns an array of FX rates aligned to the given dates using the
 * nearest available rate (forward fill, then backward fill for dates before the
 * first data point). Treats zero values as missing, matching how Yahoo Finance
 * omits rates on weekends and holidays.
 *
 * Works for both daily and period (weekly/monthly) dates: the forward-advance
 * loop always carries the last known rate up to each date, so period dates that
 * fall on weekends or holidays still get the most recent prior rate.
 *
 * Throws when the FX ticker has no valid values at all so callers can surface
 * the error to the user rather than silently producing wrong numbers.
 */
function getFxRates(dates: Date[], fxTicker: Ticker): number[] {
  const rates = new Array<number>(dates.length).fill(NaN);
  let fxIdx = 0;
  let lastKnownRate = NaN;

  // Forward pass: carry the last known rate forward.
  for (let i = 0; i < dates.length; i++) {
    while (
      fxIdx < fxTicker.dates.length &&
      !isSameDay(fxTicker.dates[fxIdx], dates[i]) &&
      isBeforeDay(fxTicker.dates[fxIdx], dates[i])
    ) {
      const val = fxTicker.values[fxIdx];
      if (!isNaN(val) && val > 0) lastKnownRate = val;
      fxIdx++;
    }
    if (fxIdx < fxTicker.dates.length && isSameDay(fxTicker.dates[fxIdx], dates[i])) {
      const val = fxTicker.values[fxIdx];
      if (!isNaN(val) && val > 0) lastKnownRate = val;
      fxIdx++;
    }
    if (!isNaN(lastKnownRate)) rates[i] = lastKnownRate;
  }

  // Find the first valid rate to fill any NaNs before it.
  let firstKnown = NaN;
  for (let i = 0; i < rates.length; i++) {
    if (!isNaN(rates[i])) { firstKnown = rates[i]; break; }
  }

  if (isNaN(firstKnown)) {
    throw new Error(
      `No FX rate data available for ${fxTicker.name}. ` +
      `Ensure the symbol is valid and Yahoo Finance data has loaded.`
    );
  }

  // Backward pass: fill any NaNs at the start from the first known rate.
  for (let i = 0; i < rates.length && isNaN(rates[i]); i++) {
    rates[i] = firstKnown;
  }

  return rates;
}

/**
 * Returns the FX rate to use for a single calendar date, using the same
 * forward-fill (last rate on or before the date) then backward-fill (first
 * valid rate when the date precedes all data) strategy as {@link getFxRates}.
 * Zero/NaN values are treated as missing (Yahoo omits rates on weekends).
 *
 * Used to convert each transaction's value at *its own date's* rate, so cost
 * basis is locked at the spot rate that applied when the cash actually moved.
 */
function getFxRateForDate(fxTicker: Ticker, date: Date): number {
  let rate = NaN;
  for (let i = 0; i < fxTicker.dates.length; i++) {
    if (isOnOrBeforeDay(fxTicker.dates[i], date)) {
      const v = fxTicker.values[i];
      if (!isNaN(v) && v > 0) rate = v;
    } else {
      break; // ticker dates are sorted ascending
    }
  }
  if (isNaN(rate)) {
    // Date precedes all FX data — backward-fill from the first valid rate.
    for (let i = 0; i < fxTicker.values.length; i++) {
      const v = fxTicker.values[i];
      if (!isNaN(v) && v > 0) { rate = v; break; }
    }
  }
  if (isNaN(rate)) {
    throw new Error(
      `No FX rate data available for ${fxTicker.name}. ` +
      `Ensure the symbol is valid and Yahoo Finance data has loaded.`
    );
  }
  return rate;
}

/**
 * Converts amounts from a stock's native currency into a chosen display
 * currency. Centralises the two FX schemes used across the portfolio engine:
 *
 *   - **spot-at-purchase** ({@link convert}, {@link convertTransactions}) — each
 *     value is converted at the rate on *its own date*, so cost basis,
 *     commission and dividends are locked at the rate that applied when the cash
 *     actually moved.
 *   - **per-date market rate** ({@link getScaledRates}) — market value is
 *     converted at the current/per-date spot rate so it tracks today's FX.
 *
 * The sub-unit `multiplier` (e.g. 0.01 for GBp pence) is folded into every
 * conversion. Methods throw when the FX ticker has no usable data, matching the
 * legacy free-function behaviour so {@link computePortfolioStateSafe} can fall
 * back to the native view.
 */
export interface FxConverter {
  readonly fxTicker: Ticker;
  readonly multiplier: number;
  /** Convert a single value at its own date's rate (spot-at-purchase). */
  convert(value: number, date: Date): number;
  /** Convert each transaction's value at its own date's rate; amounts untouched. */
  convertTransactions(txs: Transaction[]): Transaction[];
  /** Per-date market rates (× multiplier) aligned to `dates`, with fill. */
  getScaledRates(dates: Date[]): number[];
}

/**
 * Builds an {@link FxConverter} for converting `stockCurrency` into
 * `displayCurrency` using the tickers already loaded into the store.
 *
 * Returns `null` when no conversion is needed or possible: no display currency,
 * same currency, an unsupported pair, or the required FX ticker not yet loaded.
 * Callers treat `null` as "use native values unchanged".
 */
export function createFxConverter(
  stockCurrency: string,
  displayCurrency: string | undefined,
  tickers: { [ticker: string]: Ticker }
): FxConverter | null {
  if (!displayCurrency) return null;

  const { yahooTicker: fxSymbol, fxMultiplier } = getFxTickerForConversion(
    stockCurrency,
    displayCurrency
  );
  const fxTicker = fxSymbol ? tickers[fxSymbol] : undefined;
  if (!fxTicker) return null;

  const multiplier = fxMultiplier ?? 1;

  return {
    fxTicker,
    multiplier,
    convert: (value: number, date: Date) =>
      value * getFxRateForDate(fxTicker, date) * multiplier,
    convertTransactions: (txs: Transaction[]) =>
      txs.map((tx) => ({
        ...tx,
        value: tx.value * getFxRateForDate(fxTicker, tx.date) * multiplier,
      })),
    getScaledRates: (dates: Date[]) => {
      const rates = getFxRates(dates, fxTicker);
      return multiplier === 1 ? rates : rates.map((r) => r * multiplier);
    },
  };
}
