import { createFeature, createReducer, on } from '@ngrx/store';
import {
  changeHoldingCurrency,
  changeHoldingCurrencyFailure,
  changeHoldingCurrencySuccess,
  createPortfolio,
  createPortfolioFailure,
  createPortfolioSuccess,
  deleteAllTransactions,
  deleteAllTransactionsFailure,
  deleteAllTransactionsSuccess,
  deletePortfolio,
  deletePortfolioFailure,
  deletePortfolioSuccess,
  deleteTransaction,
  deleteTransactionFailure,
  deleteTransactionSuccess,
  getData,
  getDataCached,
  getDataFailure,
  getDataSuccess,
  handleFileInput,
  handleFileInputFailure,
  handleFileInputSuccess,
  importDeGiroCsv,
  importDeGiroCsvFailure,
  importDeGiroCsvSuccess,
  importYahooCsv,
  importYahooCsvFailure,
  importYahooCsvSuccess,
  renameHolding,
  renameHoldingFailure,
  renameHoldingSuccess,
  renamePortfolio,
  renamePortfolioFailure,
  renamePortfolioSuccess,
  saveTransaction,
  saveTransactionFailure,
  saveTransactionSuccess,
  setChartData,
  updateHolding,
  updateHoldingFailure,
  updateHoldingSuccess,
  updateTransaction,
  updateTransactionFailure,
  updateTransactionSuccess,
  setSelectedPortfolios,
  setTimeRange,
  updateSettings,
  updateSettingsFailure,
  updateSettingsSuccess,
} from './state.actions';
import { PortfolioDbo, Ticker, TimeRange, UserSettingsDbo } from '@aws/util';

export const featureKey = 'state';

// The reducer stores only RAW inputs: the portfolios loaded from the backend,
// user settings, and the Yahoo price tickers. All derived values (stocks, dates,
// summary, chart data) are computed on demand in memoized selectors.
export interface FeatureState {
  portfoliosDbo: PortfolioDbo[];
  settings: UserSettingsDbo;
  tickers: { [ticker: string]: Ticker };
  loading: boolean;
  error: string | null;
  lastFetched: number | null;
  // UI-only filters: not persisted to the backend.
  selectedPortfolioIds: string[] | 'all';
  timeRange: TimeRange;
}

export const initialState: FeatureState = {
  portfoliosDbo: [],
  settings: { baseCurrency: 'EUR' },
  tickers: {},
  loading: false,
  error: null,
  lastFetched: null,
  selectedPortfolioIds: 'all',
  timeRange: '1Y',
};

export const reducer = createReducer(
  initialState,
  on(getDataSuccess, (state, { data }) => ({
    ...state,
    portfoliosDbo: data.portfolios,
    settings: data.settings,
  })),
  on(
    createPortfolioSuccess,
    renamePortfolioSuccess,
    deletePortfolioSuccess,
    saveTransactionSuccess,
    updateTransactionSuccess,
    renameHoldingSuccess,
    changeHoldingCurrencySuccess,
    updateHoldingSuccess,
    deleteTransactionSuccess,
    deleteAllTransactionsSuccess,
    importDeGiroCsvSuccess,
    importYahooCsvSuccess,
    handleFileInputSuccess,
    updateSettingsSuccess,
    (state, { data }) => ({
      ...state,
      portfoliosDbo: data.portfolios,
      settings: data.settings,
    }),
  ),
  on(setChartData, (state, { tickers }) => ({ ...state, tickers })),
  on(setSelectedPortfolios, (state, { ids }) => ({
    ...state,
    selectedPortfolioIds: ids,
  })),
  on(setTimeRange, (state, { range }) => ({
    ...state,
    timeRange: range,
  })),
  // --- loading / error tracking ---
  on(
    getData,
    createPortfolio,
    renamePortfolio,
    deletePortfolio,
    saveTransaction,
    updateTransaction,
    renameHolding,
    changeHoldingCurrency,
    updateHolding,
    deleteTransaction,
    deleteAllTransactions,
    importDeGiroCsv,
    importYahooCsv,
    handleFileInput,
    updateSettings,
    (state) => ({ ...state, loading: true, error: null }),
  ),
  on(
    getDataSuccess,
    createPortfolioSuccess,
    renamePortfolioSuccess,
    deletePortfolioSuccess,
    saveTransactionSuccess,
    updateTransactionSuccess,
    renameHoldingSuccess,
    changeHoldingCurrencySuccess,
    updateHoldingSuccess,
    deleteTransactionSuccess,
    deleteAllTransactionsSuccess,
    importDeGiroCsvSuccess,
    importYahooCsvSuccess,
    handleFileInputSuccess,
    updateSettingsSuccess,
    (state) => ({ ...state, loading: false, lastFetched: Date.now() }),
  ),
  on(getDataCached, (state) => ({ ...state, loading: false })),
  on(
    getDataFailure,
    createPortfolioFailure,
    renamePortfolioFailure,
    deletePortfolioFailure,
    saveTransactionFailure,
    updateTransactionFailure,
    renameHoldingFailure,
    changeHoldingCurrencyFailure,
    updateHoldingFailure,
    deleteTransactionFailure,
    deleteAllTransactionsFailure,
    importDeGiroCsvFailure,
    importYahooCsvFailure,
    handleFileInputFailure,
    updateSettingsFailure,
    (state, { error }) => ({ ...state, loading: false, error }),
  ),
);

export const feature = createFeature({ name: featureKey, reducer });
