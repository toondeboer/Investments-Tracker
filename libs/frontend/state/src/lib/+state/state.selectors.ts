import { createFeatureSelector, createSelector } from '@ngrx/store';
import { computeAllPortfolios, computePortfolioStateSafe, mergeTransactionsDbo } from '@aws/util';
import { FeatureState, featureKey } from './state.reducer';

export const selectFeature = createFeatureSelector<FeatureState>(featureKey);

export const selectPortfoliosDbo = createSelector(
  selectFeature,
  (state) => state.portfoliosDbo
);

export const selectSettings = createSelector(
  selectFeature,
  (state) => state.settings
);

export const selectBaseCurrency = createSelector(
  selectSettings,
  (settings) => settings.baseCurrency
);

const selectTickers = createSelector(
  selectFeature,
  (state) => state.tickers
);

export const selectLoading = createSelector(
  selectFeature,
  (state) => state.loading
);

export const selectError = createSelector(
  selectFeature,
  (state) => state.error
);

export const selectLastFetched = createSelector(
  selectFeature,
  (state) => state.lastFetched
);

export const selectSelectedPortfolioIds = createSelector(
  selectFeature,
  (state) => state.selectedPortfolioIds
);

export const selectTimeRange = createSelector(
  selectFeature,
  (state) => state.timeRange
);

// The portfolios that are currently visible on the dashboard.
export const selectVisiblePortfoliosDbo = createSelector(
  selectPortfoliosDbo,
  selectSelectedPortfolioIds,
  (portfolios, ids) =>
    ids === 'all' ? portfolios : portfolios.filter((p) => ids.includes(p.id))
);

// Aggregate portfolio with a separate fxError so the error can be surfaced
// without crashing the selector chain.
const selectAggregatePortfolioResult = createSelector(
  selectVisiblePortfoliosDbo,
  selectTickers,
  selectBaseCurrency,
  selectTimeRange,
  (portfolios, tickers, baseCurrency, timeRange) => {
    const merged = mergeTransactionsDbo(portfolios.map((p) => p.transactions));
    return computePortfolioStateSafe(merged, tickers, baseCurrency, timeRange);
  }
);

// Per-portfolio computed states keyed by portfolio ID.
// Always uses '1Y' range so per-portfolio summary cards show accurate returns.
// FX errors are isolated per portfolio inside computeAllPortfolios.
export const selectAllPortfolioStates = createSelector(
  selectPortfoliosDbo,
  selectTickers,
  selectBaseCurrency,
  (portfolios, tickers, baseCurrency) =>
    computeAllPortfolios(portfolios, tickers, baseCurrency, '1Y')
);

// Public view-model — same shape as before (transactions, stocks, dates, summary,
// currencies) plus loading/error. Backward compat for existing components.
export const selectState = createSelector(
  selectAggregatePortfolioResult,
  selectLoading,
  selectError,
  ({ portfolio, fxError }, loading, error) => ({
    ...portfolio,
    loading,
    error: error || fxError,
  })
);
