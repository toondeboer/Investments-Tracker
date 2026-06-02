import { PortfolioDbo, Stock, Summary, Ticker, TimeRange, Transaction, Transactions, TransactionsDbo } from './types';
import {
  addLists,
  getCurrencies,
  getDailyDates,
  getDividendPerQuarter,
  getDividendPerQuarterByYear,
  getDividendTtmPerQuarter,
  getFxTickerForConversion,
  getGranularityForRange,
  getMonthlyDates,
  getMostRecentValueFromList,
  getPortfolioValues,
  getPortfolioValuesByPeriod,
  getRangeStartDate,
  getReturn,
  getStartDate,
  getTransactionAmountsAndValues,
  getTransactionAmountsAndValuesByPeriod,
  getWeeklyDates,
  computePreRangeSnapshot,
  getYieldPerYear,
  isBeforeDay,
  isOnOrBeforeDay,
  isSameDay,
  multiplyLists,
  subtractLists,
  transactionsDboToStocks,
  transactionsDboToTransactions,
  updateDividendsByPeriod,
} from './util';

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
 * Returns a copy of the transactions with each value converted to the display
 * currency at the FX rate on that transaction's own date (times the sub-unit
 * multiplier, e.g. 0.01 for GBp). Share amounts are left untouched.
 */
function convertTransactionValues(
  txs: Transaction[],
  fxTicker: Ticker,
  multiplier: number
): Transaction[] {
  return txs.map((tx) => ({
    ...tx,
    value: tx.value * getFxRateForDate(fxTicker, tx.date) * multiplier,
  }));
}

export interface PortfolioState {
  transactions: Transactions;
  stocks: { [ticker: string]: Stock };
  dates: Date[];
  summary: Summary;
  currencies: string[];
}

export interface PortfolioComputedState extends PortfolioState {
  portfolioId: string;
  portfolioName: string;
}

export function createInitialSummary(): Summary {
  return {
    portfolioValue: 0,
    totalInvested: 0,
    totalDividend: 0,
    totalCommission: 0,
    startDate: new Date(),
    dailyReturn: { absolute: 0, percentage: 0 },
    weeklyReturn: { absolute: 0, percentage: 0 },
    monthlyReturn: { absolute: 0, percentage: 0 },
    totalReturn: { absolute: 0, percentage: 0 },
  };
}

/**
 * Derives the full portfolio view-model from the raw inputs: the stored
 * transactions (DTO) and the fetched Yahoo price tickers.
 *
 * The optional `range` parameter controls which time window is visualised:
 *   - '1M', '3M', '6M', 'YTD', '1Y' → daily data for that window
 *   - '5Y'                            → weekly data (one point per week)
 *   - 'ALL'                           → monthly data (one point per month)
 *
 * Summary chips (dailyReturn, weeklyReturn, monthlyReturn) are always computed
 * from a separate 30-day daily window regardless of chart granularity, so they
 * stay accurate even when the chart is at weekly or monthly resolution.
 */
export function computePortfolioState(
  transactionsDbo: TransactionsDbo,
  tickers: { [ticker: string]: Ticker },
  displayCurrency?: string,
  range: TimeRange = 'ALL'
): PortfolioState {
  const baseStocks = transactionsDboToStocks(transactionsDbo);
  const transactions = transactionsDboToTransactions(transactionsDbo);
  const currencies = getCurrencies(baseStocks);

  // No transactions yet -> empty portfolio with default summary.
  if (Object.keys(baseStocks).length === 0) {
    return {
      transactions,
      stocks: {},
      dates: [],
      summary: createInitialSummary(),
      currencies,
    };
  }

  // --- Stage 1: transaction-derived data ---
  const startDate = getStartDate(baseStocks);
  const today = new Date();

  const granularity = getGranularityForRange(range);
  const rangeStart = getRangeStartDate(range, startDate);
  // Clamp rangeStart to portfolio start — can't display before first transaction.
  const effectiveRangeStart = isBeforeDay(startDate, rangeStart) ? rangeStart : startDate;

  let dates: Date[];
  if (granularity === 'monthly') {
    dates = getMonthlyDates(effectiveRangeStart, today);
  } else if (granularity === 'weekly') {
    dates = getWeeklyDates(effectiveRangeStart, today);
  } else {
    dates = getDailyDates(effectiveRangeStart, today);
  }

  // 30-day daily window used for return calculations (always accurate).
  const returnWindowStart = new Date(today);
  returnWindowStart.setUTCDate(returnWindowStart.getUTCDate() - 30);
  const returnDates = getDailyDates(
    isBeforeDay(startDate, returnWindowStart) ? returnWindowStart : startDate,
    today
  );

  let totalInvestedSummary = 0;
  let totalDividendSummary = 0;
  let totalCommissionSummary = 0;

  const computedStocks: { [ticker: string]: Stock } = {};
  for (const key of Object.keys(baseStocks)) {
    const stock = baseStocks[key];
    const t = stock.transactions;

    // For daily ranges, pre-compute historical holdings before the range window
    // so that aggregatedAmounts/aggregatedValues start from the correct baseline.
    const stockSnapshot = computePreRangeSnapshot(t.stock, effectiveRangeStart);
    const dividendSnapshot = computePreRangeSnapshot(t.dividend, effectiveRangeStart);
    const commissionSnapshot = computePreRangeSnapshot(t.commission, effectiveRangeStart);

    // Chart-resolution data for this stock.
    const stockAmountsAndValues = granularity === 'daily'
      ? getTransactionAmountsAndValues(dates, t.stock, stockSnapshot.amount, stockSnapshot.value)
      : getTransactionAmountsAndValuesByPeriod(dates, t.stock, effectiveRangeStart);

    const dividendAmountsAndValues = granularity === 'daily'
      ? getTransactionAmountsAndValues(dates, t.dividend, dividendSnapshot.amount, dividendSnapshot.value)
      : getTransactionAmountsAndValuesByPeriod(dates, t.dividend, effectiveRangeStart);

    const commissionAmountsAndValues = granularity === 'daily'
      ? getTransactionAmountsAndValues(dates, t.commission, commissionSnapshot.amount, commissionSnapshot.value)
      : getTransactionAmountsAndValuesByPeriod(dates, t.commission, effectiveRangeStart);

    const dividendPerQuarterByYear = getDividendPerQuarterByYear(startDate, t.dividend);
    const dividendPerQuarter = getDividendPerQuarter(startDate, dividendPerQuarterByYear);
    const dividendTtmPerQuarter = getDividendTtmPerQuarter(dividendPerQuarter);

    // Point-in-time totals: sum all historical transactions (O(transactions)).
    const totalInvested = t.stock.reduce((s, tx) => s + tx.value, 0);
    totalInvestedSummary += totalInvested;
    const amountOfShares = getMostRecentValueFromList(
      stockAmountsAndValues.aggregatedAmounts
    ).value;
    const totalDividend = t.dividend.reduce((s, tx) => s + tx.value, 0);
    totalDividendSummary += totalDividend;
    const totalCommission = t.commission.reduce((s, tx) => s + tx.value, 0);
    totalCommissionSummary += totalCommission;

    computedStocks[key] = {
      ...stock,
      chartData: {
        ...stock.chartData,
        stock: { ...stockAmountsAndValues },
        dividend: {
          ...dividendAmountsAndValues,
          perQuarterByYear: dividendPerQuarterByYear,
          perQuarter: dividendPerQuarter,
          ttmPerQuarter: dividendTtmPerQuarter,
        },
        commission: { ...commissionAmountsAndValues },
      },
      summary: {
        ...stock.summary,
        totalInvested,
        amountOfShares,
        averageSharePrice: amountOfShares !== 0 ? totalInvested / amountOfShares : 0,
        totalDividend,
        totalCommission,
      },
    };
  }

  let summary: Summary = {
    ...createInitialSummary(),
    totalInvested: totalInvestedSummary,
    totalDividend: totalDividendSummary,
    totalCommission: totalCommissionSummary,
    startDate,
  };

  // No prices yet -> return the transaction-only view.
  if (Object.keys(tickers).length === 0) {
    return { transactions, stocks: computedStocks, dates, summary, currencies };
  }

  // --- Stage 2: price-derived data ---
  let portfolioValuesSummary = 0;
  let aggregatedPortfolioValues: number[] = [];
  let aggregatedProfit: number[] = [];
  let chartTotalDividendSummary = 0;
  let chartTotalInvestedSummary = 0;
  let chartTotalCommissionSummary = 0;

  // Aggregated portfolio values over the 30-day return window (always daily).
  let returnWindowPortfolioValues: number[] = [];
  let returnWindowProfit: number[] = [];

  // Full-history monthly dates — used for yield and dividend bar charts so they
  // always display the complete portfolio history regardless of the selected range.
  const allTimeDates = getMonthlyDates(startDate, today);

  const chartedStocks: { [ticker: string]: Stock } = {};
  for (const key of Object.keys(computedStocks)) {
    const stock = computedStocks[key];
    const ticker = tickers[key];
    const t = stock.transactions; // shorthand for this stock's sorted transactions

    // Prices for this stock haven't arrived yet — keep the stage-1 view.
    if (!ticker) {
      chartedStocks[key] = stock;
      continue;
    }

    // --- Chart arrays at selected granularity (for performance charts) ---
    const portfolioValuesNative = granularity === 'daily'
      ? getPortfolioValues(dates, stock.chartData.stock.aggregatedAmounts, ticker)
      : getPortfolioValuesByPeriod(dates, stock.chartData.stock.aggregatedAmounts, ticker);

    const { yahooTicker: fxSymbol, fxMultiplier } = displayCurrency
      ? getFxTickerForConversion(stock.currency.value, displayCurrency)
      : {};
    const fxTicker = fxSymbol ? tickers[fxSymbol] : undefined;
    const m = fxMultiplier ?? 1;

    // Transactions with each value pre-converted at its own date's FX rate, so
    // cost basis / commission / dividends are locked at the spot rate that
    // applied when the cash moved (spot-at-purchase). Market value, by
    // contrast, is converted at the current/per-date spot rate below.
    const fxConvert = fxTicker
      ? (value: number, date: Date) => value * getFxRateForDate(fxTicker, date) * m
      : undefined;
    const stockTxFx = fxTicker ? convertTransactionValues(t.stock, fxTicker, m) : t.stock;
    const commissionTxFx = fxTicker ? convertTransactionValues(t.commission, fxTicker, m) : t.commission;

    let portfolioValues = portfolioValuesNative;
    let investedForProfit = stock.chartData.stock.aggregatedValues;
    let commissionForProfit = stock.chartData.commission.aggregatedValues;
    let stockTransactionValues = stock.chartData.stock.transactionValues;
    let commissionTransactionValues = stock.chartData.commission.transactionValues;
    let currentSharePrice = getMostRecentValueFromList(ticker.values).value;

    // --- All-time monthly data for dividend bar charts and yield (range-independent) ---
    // These use full history so the dividend/yield charts always show complete data.
    const allTimeStockData = getTransactionAmountsAndValuesByPeriod(allTimeDates, t.stock, startDate);
    const allTimePortfolioValuesNative = getPortfolioValuesByPeriod(allTimeDates, allTimeStockData.aggregatedAmounts, ticker);
    const allTimeCommissionData = getTransactionAmountsAndValuesByPeriod(allTimeDates, t.commission, startDate);
    const allTimeDividendBase = updateDividendsByPeriod(
      allTimeStockData.aggregatedAmounts, ticker, allTimeDates, startDate, startDate, fxConvert
    );

    let allTimePortfolioValues = allTimePortfolioValuesNative;
    let allTimeInvested = allTimeStockData.aggregatedValues;
    let allTimeCommissionAgg = allTimeCommissionData.aggregatedValues;
    // Dividends are already in the display currency (fxConvert applied at the
    // ex-date inside updateDividendsByPeriod), so every dividend array below is
    // taken straight from the converted base — no second per-period scaling.
    const allTimeDividendPerQuarterByYear = allTimeDividendBase.perQuarterByYear;
    const allTimeDividendPerQuarter = allTimeDividendBase.perQuarter;
    const allTimeDividendTtmPerQuarter = allTimeDividendBase.ttmPerQuarter;
    const dividendTransactionValues = allTimeDividendBase.transactionValues;
    const dividendTransactionAmounts = allTimeDividendBase.transactionAmounts;
    const dividendAggregatedValues = allTimeDividendBase.aggregatedValues;
    const dividendAggregatedAmounts = allTimeDividendBase.aggregatedAmounts;
    const allTimeTotalDividend = getMostRecentValueFromList(allTimeDividendBase.aggregatedValues).value;

    if (fxTicker) {
      // Market value: convert at the current/per-date spot rate.
      const fxRates = getFxRates(dates, fxTicker);
      const scaledRates = m === 1 ? fxRates : fxRates.map(r => r * m);
      portfolioValues = multiplyLists(portfolioValuesNative, scaledRates);
      const lastScaledRate = getMostRecentValueFromList(scaledRates).value;
      currentSharePrice = currentSharePrice * lastScaledRate;

      const allTimeFxRates = getFxRates(allTimeDates, fxTicker);
      const allTimeScaledRates = m === 1 ? allTimeFxRates : allTimeFxRates.map(r => r * m);
      allTimePortfolioValues = multiplyLists(allTimePortfolioValuesNative, allTimeScaledRates);

      // Cost basis: re-aggregate from the spot-at-purchase transaction values.
      const stockSnapFx = computePreRangeSnapshot(stockTxFx, effectiveRangeStart);
      const commissionSnapFx = computePreRangeSnapshot(commissionTxFx, effectiveRangeStart);
      const stockAggFx = granularity === 'daily'
        ? getTransactionAmountsAndValues(dates, stockTxFx, stockSnapFx.amount, stockSnapFx.value)
        : getTransactionAmountsAndValuesByPeriod(dates, stockTxFx, effectiveRangeStart);
      const commissionAggFx = granularity === 'daily'
        ? getTransactionAmountsAndValues(dates, commissionTxFx, commissionSnapFx.amount, commissionSnapFx.value)
        : getTransactionAmountsAndValuesByPeriod(dates, commissionTxFx, effectiveRangeStart);
      investedForProfit = stockAggFx.aggregatedValues;
      commissionForProfit = commissionAggFx.aggregatedValues;
      stockTransactionValues = stockAggFx.transactionValues;
      commissionTransactionValues = commissionAggFx.transactionValues;

      allTimeInvested = getTransactionAmountsAndValuesByPeriod(allTimeDates, stockTxFx, startDate).aggregatedValues;
      allTimeCommissionAgg = getTransactionAmountsAndValuesByPeriod(allTimeDates, commissionTxFx, startDate).aggregatedValues;
    }

    const convertedDividend = {
      transactionValues: dividendTransactionValues,
      transactionAmounts: dividendTransactionAmounts,
      aggregatedValues: dividendAggregatedValues,
      aggregatedAmounts: dividendAggregatedAmounts,
      perQuarterByYear: allTimeDividendPerQuarterByYear,
      perQuarter: allTimeDividendPerQuarter,
      ttmPerQuarter: allTimeDividendTtmPerQuarter,
    };

    aggregatedPortfolioValues =
      aggregatedPortfolioValues.length > 0
        ? addLists(aggregatedPortfolioValues, portfolioValues)
        : portfolioValues;

    const portfolioValue = getMostRecentValueFromList(portfolioValues).value;
    portfolioValuesSummary += portfolioValue;

    const profit = subtractLists(
      subtractLists(portfolioValues, investedForProfit),
      commissionForProfit
    );
    aggregatedProfit =
      aggregatedProfit.length > 0
        ? addLists(aggregatedProfit, profit)
        : profit;

    // All-time profit for yield (same monthly granularity as allTimePortfolioValues).
    const allTimeProfit = subtractLists(
      subtractLists(allTimePortfolioValues, allTimeInvested),
      allTimeCommissionAgg
    );
    const yieldPerYear = getYieldPerYear(allTimeDates, allTimePortfolioValues, allTimeProfit);

    // --- 30-day daily return window (always accurate regardless of chart granularity) ---
    const preReturnStockSnapshot = computePreRangeSnapshot(t.stock, returnDates[0] ?? today);
    const preReturnCommissionSnapshot = computePreRangeSnapshot(t.commission, returnDates[0] ?? today);

    const returnWindowStockAmounts = getTransactionAmountsAndValues(
      returnDates, t.stock, preReturnStockSnapshot.amount, preReturnStockSnapshot.value
    );
    const returnWindowCommissionAmounts = getTransactionAmountsAndValues(
      returnDates, t.commission, 0, preReturnCommissionSnapshot.value
    );

    const returnPortfolioValuesNative = getPortfolioValues(
      returnDates, returnWindowStockAmounts.aggregatedAmounts, ticker
    );

    let returnPortfolioValues = returnPortfolioValuesNative;
    let returnInvestedForProfit = returnWindowStockAmounts.aggregatedValues;
    let returnCommissionForProfit = returnWindowCommissionAmounts.aggregatedValues;

    if (fxTicker) {
      // Market value at current/per-date spot; cost basis at spot-at-purchase.
      const returnFxRates = getFxRates(returnDates, fxTicker);
      const returnScaledRates = m === 1 ? returnFxRates : returnFxRates.map(r => r * m);
      returnPortfolioValues = multiplyLists(returnPortfolioValuesNative, returnScaledRates);

      const preStockFx = computePreRangeSnapshot(stockTxFx, returnDates[0] ?? today);
      const preCommissionFx = computePreRangeSnapshot(commissionTxFx, returnDates[0] ?? today);
      returnInvestedForProfit = getTransactionAmountsAndValues(
        returnDates, stockTxFx, preStockFx.amount, preStockFx.value
      ).aggregatedValues;
      returnCommissionForProfit = getTransactionAmountsAndValues(
        returnDates, commissionTxFx, 0, preCommissionFx.value
      ).aggregatedValues;
    }

    const returnProfit = subtractLists(
      subtractLists(returnPortfolioValues, returnInvestedForProfit),
      returnCommissionForProfit
    );

    // nanAsZero: one stock with a missing price on a given day must not turn the
    // whole portfolio's return for that day into NaN.
    returnWindowPortfolioValues =
      returnWindowPortfolioValues.length > 0
        ? addLists(returnWindowPortfolioValues, returnPortfolioValues, true)
        : returnPortfolioValues;
    returnWindowProfit =
      returnWindowProfit.length > 0
        ? addLists(returnWindowProfit, returnProfit, true)
        : returnProfit;

    // --- Per-stock return figures from the 30-day window ---
    const dailyReturn = getReturn(returnPortfolioValues, returnProfit, 1);
    const weeklyReturn = getReturn(returnPortfolioValues, returnProfit, 7);
    const monthlyReturn = getReturn(returnPortfolioValues, returnProfit, 30);

    // Total return: point-in-time (currentValue - totalInvested - totalCommission).
    const stockTotalInvested = getMostRecentValueFromList(investedForProfit).value;
    const stockTotalCommission = getMostRecentValueFromList(commissionForProfit).value;
    const totalReturnAbsolute = portfolioValue - stockTotalInvested - stockTotalCommission;
    const totalReturn = {
      absolute: totalReturnAbsolute,
      percentage:
        Number.isFinite(portfolioValue) && portfolioValue !== 0
          ? (totalReturnAbsolute / portfolioValue) * 100
          : 0,
    };

    chartTotalInvestedSummary += stockTotalInvested;
    chartTotalCommissionSummary += stockTotalCommission;
    chartTotalDividendSummary += allTimeTotalDividend;

    chartedStocks[key] = {
      ...stock,
      summary: {
        ...stock.summary,
        portfolioValue,
        currentSharePrice,
        totalInvested: stockTotalInvested,
        totalCommission: stockTotalCommission,
        averageSharePrice:
          stock.summary.amountOfShares !== 0
            ? stockTotalInvested / stock.summary.amountOfShares
            : 0,
        dailyReturn,
        weeklyReturn,
        monthlyReturn,
        totalReturn,
        totalDividend: allTimeTotalDividend,
      },
      chartData: {
        ...stock.chartData,
        portfolioValues,
        profit,
        yieldPerYear,
        allTimeDates,
        allTimePortfolioValues,
        allTimeProfit,
        stock: {
          ...stock.chartData.stock,
          transactionValues: stockTransactionValues,
          aggregatedValues: investedForProfit,
        },
        commission: {
          ...stock.chartData.commission,
          transactionValues: commissionTransactionValues,
          aggregatedValues: commissionForProfit,
        },
        dividend: convertedDividend,
      },
    };
  }

  // Aggregate summary returns from the 30-day daily window.
  const dailyReturn = getReturn(returnWindowPortfolioValues, returnWindowProfit, 1);
  const weeklyReturn = getReturn(returnWindowPortfolioValues, returnWindowProfit, 7);
  const monthlyReturn = getReturn(returnWindowPortfolioValues, returnWindowProfit, 30);

  const totalReturnAbsolute = portfolioValuesSummary - chartTotalInvestedSummary - chartTotalCommissionSummary;
  const totalReturn = {
    absolute: totalReturnAbsolute,
    percentage:
      Number.isFinite(portfolioValuesSummary) && portfolioValuesSummary !== 0
        ? (totalReturnAbsolute / portfolioValuesSummary) * 100
        : 0,
  };

  summary = {
    ...summary,
    portfolioValue: portfolioValuesSummary,
    totalInvested: chartTotalInvestedSummary,
    totalCommission: chartTotalCommissionSummary,
    totalDividend: chartTotalDividendSummary,
    dailyReturn,
    weeklyReturn,
    monthlyReturn,
    totalReturn,
  };

  return { transactions, stocks: chartedStocks, dates, summary, currencies };
}

/**
 * Computes the portfolio state, falling back to an unconverted (native) view if
 * FX conversion fails (e.g. a required FX rate hasn't loaded). Returns the
 * fxError message alongside so callers can surface it without the selector
 * chain throwing. This is the single place the FX try/catch lives.
 */
export function computePortfolioStateSafe(
  transactionsDbo: TransactionsDbo,
  tickers: { [ticker: string]: Ticker },
  displayCurrency?: string,
  range: TimeRange = 'ALL'
): { portfolio: PortfolioState; fxError: string | null } {
  try {
    return {
      portfolio: computePortfolioState(transactionsDbo, tickers, displayCurrency, range),
      fxError: null,
    };
  } catch (err) {
    return {
      portfolio: computePortfolioState(transactionsDbo, tickers, undefined, range),
      fxError: err instanceof Error ? err.message : 'FX conversion failed',
    };
  }
}

/**
 * Runs computePortfolioState for each portfolio and returns a map keyed by
 * portfolio ID. Used by per-portfolio selectors and the Portfolios page.
 *
 * FX errors are isolated per portfolio: a missing FX rate in one portfolio
 * falls that portfolio back to its native view without stripping conversion
 * from the others.
 */
export function computeAllPortfolios(
  portfoliosDbo: PortfolioDbo[],
  tickers: { [ticker: string]: Ticker },
  baseCurrency?: string,
  range: TimeRange = 'ALL'
): { [id: string]: PortfolioComputedState } {
  const result: { [id: string]: PortfolioComputedState } = {};
  for (const portfolio of portfoliosDbo) {
    result[portfolio.id] = {
      ...computePortfolioStateSafe(portfolio.transactions, tickers, baseCurrency, range).portfolio,
      portfolioId: portfolio.id,
      portfolioName: portfolio.name,
    };
  }
  return result;
}
