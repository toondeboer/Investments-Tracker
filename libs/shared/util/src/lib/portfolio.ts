import { ChartGranularity, PortfolioDbo, Stock, Summary, Ticker, TimeRange, Transactions, TransactionsDbo } from './types';
import {
  addLists,
  buildStockSeries,
  createFxConverter,
  getCurrencies,
  getDailyDates,
  getDividendPerQuarter,
  getDividendPerQuarterByYear,
  getDividendTtmPerQuarter,
  getGranularityForRange,
  getMonthlyDates,
  getMostRecentValueFromList,
  getRangeStartDate,
  getReturn,
  getStartDate,
  getTransactionAmountsAndValues,
  getTransactionAmountsAndValuesByPeriod,
  getWeeklyDates,
  computePreRangeSnapshot,
  getYieldPerYear,
  isBeforeDay,
  transactionsDboToStocks,
  transactionsDboToTransactions,
  updateDividendsByPeriod,
} from './util';

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
  const txState = computeTransactionState(transactionsDbo, range);

  // No stocks, or prices haven't arrived yet -> the transaction-only view.
  if (Object.keys(txState.stocks).length === 0 || Object.keys(tickers).length === 0) {
    const { transactions, stocks, dates, summary, currencies } = txState;
    return { transactions, stocks, dates, summary, currencies };
  }

  return computePriceState(txState, tickers, displayCurrency);
}

/**
 * Stage-1 output: the transaction-derived view plus the date boundaries stage 2
 * needs. Four distinct date boundaries flow through the engine:
 *   - `startDate` — the portfolio's first transaction; anchors all-time series.
 *   - `effectiveRangeStart` — first date the selected range can show, clamped to
 *     `startDate`.
 *   - `windowStart` (= `dates[0]`) — the pre-range snapshot cutoff for daily
 *     ranges; everything strictly before it folds into the opening baseline.
 *   - `returnDates[0]` — start of the rolling 30-day return window.
 */
interface TransactionState extends PortfolioState {
  startDate: Date;
  today: Date;
  granularity: ChartGranularity;
  effectiveRangeStart: Date;
  windowStart: Date;
  returnDates: Date[];
}

/** Stage 1: everything derivable from the transactions alone (no prices). */
function computeTransactionState(
  transactionsDbo: TransactionsDbo,
  range: TimeRange
): TransactionState {
  const baseStocks = transactionsDboToStocks(transactionsDbo);
  const transactions = transactionsDboToTransactions(transactionsDbo);
  const currencies = getCurrencies(baseStocks);
  const today = new Date();

  // No transactions yet -> empty portfolio with default summary. The date
  // boundaries below are unused (the orchestrator returns before stage 2).
  if (Object.keys(baseStocks).length === 0) {
    return {
      transactions, stocks: {}, dates: [], summary: createInitialSummary(), currencies,
      startDate: today, today, granularity: 'monthly',
      effectiveRangeStart: today, windowStart: today, returnDates: [],
    };
  }

  const startDate = getStartDate(baseStocks);

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

  // The daily pre-range snapshot baseline must be everything STRICTLY BEFORE the
  // first chart date. getDailyDates starts one day before effectiveRangeStart,
  // so the baseline cutoff is dates[0] (not effectiveRangeStart) — otherwise a
  // transaction landing exactly on dates[0] is counted both in the snapshot and
  // in-window, making the summary totals wrongly depend on the selected range.
  const windowStart = dates[0] ?? effectiveRangeStart;

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
    const stockSnapshot = computePreRangeSnapshot(t.stock, windowStart);
    const dividendSnapshot = computePreRangeSnapshot(t.dividend, windowStart);
    const commissionSnapshot = computePreRangeSnapshot(t.commission, windowStart);

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

  const summary: Summary = {
    ...createInitialSummary(),
    totalInvested: totalInvestedSummary,
    totalDividend: totalDividendSummary,
    totalCommission: totalCommissionSummary,
    startDate,
  };

  return {
    transactions, stocks: computedStocks, dates, summary, currencies,
    startDate, today, granularity, effectiveRangeStart, windowStart, returnDates,
  };
}

/** Stage 2: enrich the stage-1 view with prices (value, profit, returns, yield). */
function computePriceState(
  txState: TransactionState,
  tickers: { [ticker: string]: Ticker },
  displayCurrency?: string
): PortfolioState {
  const {
    transactions, currencies, dates, granularity, effectiveRangeStart,
    windowStart, returnDates, startDate, today, stocks: computedStocks,
  } = txState;

  let portfolioValuesSummary = 0;
  let chartTotalDividendSummary = 0;
  let chartTotalInvestedSummary = 0;
  let chartTotalCommissionSummary = 0;

  // Gross invested capital (sum of buy values, never reduced by sells) — the
  // denominator for return-on-invested-capital percentages. It only grows, so a
  // sold position can't collapse it to zero, and the % reconciles with profit.
  let grossInvestedSummary = 0;

  // Aggregated profit over the 30-day return window (always daily), summed
  // across stocks with nanAsZero so a single closed market doesn't void the day.
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

    const fx = createFxConverter(stock.currency.value, displayCurrency, tickers);

    // Transactions with each value pre-converted at its own date's FX rate, so
    // cost basis / commission / dividends are locked at the spot rate that
    // applied when the cash moved (spot-at-purchase). Market value, by
    // contrast, is converted at the current/per-date spot rate inside the
    // series builder.
    const fxConvert = fx ? fx.convert : undefined;
    const stockTxFx = fx ? fx.convertTransactions(t.stock) : t.stock;
    const commissionTxFx = fx ? fx.convertTransactions(t.commission) : t.commission;

    const fxArgs = {
      ticker,
      fx,
      stockTxs: t.stock,
      stockTxsFx: stockTxFx,
      commissionTxs: t.commission,
      commissionTxsFx: commissionTxFx,
    } as const;

    // --- Selected-range series (drives the performance charts) ---
    // forwardFill: on daily ranges the market is closed on weekends/holidays, so
    // getPortfolioValues yields NaN there; carry the last known value across them
    // so the value/profit charts stay continuous instead of dropping to the axis.
    // (No-op at weekly/monthly granularity, which already carries the last price.)
    const rangeSeries = buildStockSeries({
      ...fxArgs,
      dates,
      granularity,
      snapshotCutoff: windowStart,
      periodRangeStart: effectiveRangeStart,
      commissionSnapshotAmount: 'snapshot',
      forwardFill: true,
    });
    const portfolioValues = rangeSeries.portfolioValues;
    const investedForProfit = rangeSeries.invested;
    const commissionForProfit = rangeSeries.commission;
    const profit = rangeSeries.profit;
    const stockTransactionValues = rangeSeries.stockTransactionValues;
    const commissionTransactionValues = rangeSeries.commissionTransactionValues;

    // Current share price in the display currency (today's spot rate).
    let currentSharePrice = getMostRecentValueFromList(ticker.values).value;
    if (fx) {
      currentSharePrice *= getMostRecentValueFromList(fx.getScaledRates(dates)).value;
    }

    // --- All-time monthly series for yield + dividend charts (range-independent) ---
    // Always full history so the dividend/yield charts show complete data.
    const allTimeSeries = buildStockSeries({
      ...fxArgs,
      dates: allTimeDates,
      granularity: 'monthly',
      snapshotCutoff: startDate, // unused at monthly granularity
      periodRangeStart: startDate,
    });
    const allTimePortfolioValues = allTimeSeries.portfolioValues;
    const allTimeInvested = allTimeSeries.invested;
    const allTimeProfit = allTimeSeries.profit;

    // Dividends use the native all-time share counts and are converted at the
    // ex-date inside updateDividendsByPeriod, so they're already in the display
    // currency — no second per-period scaling.
    const allTimeDividendBase = updateDividendsByPeriod(
      allTimeSeries.aggregatedAmounts, ticker, allTimeDates, startDate, startDate, fxConvert
    );
    const convertedDividend = {
      transactionValues: allTimeDividendBase.transactionValues,
      transactionAmounts: allTimeDividendBase.transactionAmounts,
      aggregatedValues: allTimeDividendBase.aggregatedValues,
      aggregatedAmounts: allTimeDividendBase.aggregatedAmounts,
      perQuarterByYear: allTimeDividendBase.perQuarterByYear,
      perQuarter: allTimeDividendBase.perQuarter,
      ttmPerQuarter: allTimeDividendBase.ttmPerQuarter,
    };
    const allTimeTotalDividend = getMostRecentValueFromList(allTimeDividendBase.aggregatedValues).value;

    // Per-year annual return (%) via Modified Dietz — each year in isolation,
    // money-weighted, including dividends received.
    const yieldPerYear = getYieldPerYear(
      allTimeDates,
      allTimePortfolioValues,
      allTimeInvested,
      allTimeDividendBase.aggregatedValues
    );

    const portfolioValue = getMostRecentValueFromList(portfolioValues).value;
    portfolioValuesSummary += portfolioValue;

    // Gross invested capital for this stock: sum of buy values only (sells are
    // negative and excluded), at spot-at-purchase FX. This is the denominator
    // for the return-on-invested-capital percentage.
    const stockGrossInvested = stockTxFx.reduce((s, tx) => s + (tx.value > 0 ? tx.value : 0), 0);
    grossInvestedSummary += stockGrossInvested;

    // --- 30-day daily return window (accurate regardless of chart granularity) ---
    // Commission seeds at amount 0 (share counts irrelevant here) and values are
    // forward-filled across closed days so a stock that's merely closed doesn't
    // zero out and corrupt the summed windowed (1D/1W/1M) return.
    const returnSeries = buildStockSeries({
      ...fxArgs,
      dates: returnDates,
      granularity: 'daily',
      snapshotCutoff: returnDates[0] ?? today,
      periodRangeStart: returnDates[0] ?? today, // unused at daily granularity
      commissionSnapshotAmount: 'zero',
      forwardFill: true,
    });
    const returnProfit = returnSeries.profit;

    // nanAsZero: one stock with a missing price on a given day must not turn the
    // whole portfolio's return for that day into NaN.
    returnWindowProfit =
      returnWindowProfit.length > 0
        ? addLists(returnWindowProfit, returnProfit, true)
        : returnProfit;

    // --- Per-stock return figures from the 30-day window ---
    // absolute = profit change over the window; percentage = that change as a
    // fraction of gross invested capital (return on invested capital).
    const dailyReturn = getReturn(returnProfit, stockGrossInvested, 1);
    const weeklyReturn = getReturn(returnProfit, stockGrossInvested, 7);
    const monthlyReturn = getReturn(returnProfit, stockGrossInvested, 30);

    // Total return (the simple, easy-to-explain formula):
    //   absolute = sale proceeds + current value − purchase cost + dividends
    //            = currentValue − netInvested + dividends
    //   percentage = absolute / purchase cost (gross invested) × 100
    // Gross invested as the base keeps the % sane after a sale (it can't
    // collapse to zero). Commission is not part of this figure.
    const stockTotalInvested = getMostRecentValueFromList(investedForProfit).value;
    const stockTotalCommission = getMostRecentValueFromList(commissionForProfit).value;
    const totalReturnAbsolute = portfolioValue - stockTotalInvested + allTimeTotalDividend;
    const totalReturn = {
      absolute: totalReturnAbsolute,
      percentage:
        stockGrossInvested !== 0 ? (totalReturnAbsolute / stockGrossInvested) * 100 : 0,
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
        allTimeInvested,
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
  const dailyReturn = getReturn(returnWindowProfit, grossInvestedSummary, 1);
  const weeklyReturn = getReturn(returnWindowProfit, grossInvestedSummary, 7);
  const monthlyReturn = getReturn(returnWindowProfit, grossInvestedSummary, 30);

  // Total return (the simple, easy-to-explain formula):
  //   absolute = sale proceeds + current value − purchase cost + dividends
  //            = currentValue − netInvested + dividends
  //   percentage = absolute / purchase cost (gross invested) × 100
  // Gross invested as the base keeps the % sane after a sale; commission is not
  // part of this figure. The total-return-per-year chart uses the same formula.
  const totalReturnAbsolute = portfolioValuesSummary - chartTotalInvestedSummary + chartTotalDividendSummary;
  const totalReturn = {
    absolute: totalReturnAbsolute,
    percentage:
      grossInvestedSummary !== 0 ? (totalReturnAbsolute / grossInvestedSummary) * 100 : 0,
  };

  const summary: Summary = {
    ...txState.summary,
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
