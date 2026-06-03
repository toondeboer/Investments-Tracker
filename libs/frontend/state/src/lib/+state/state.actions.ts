import {
  CsvInput,
  CsvInputEnglish,
  DatabaseDto,
  PortfolioDbo,
  Ticker,
  TimeRange,
  Transaction,
  TransactionKey,
  TransactionsDbo,
  UserSettingsDbo,
} from '@aws/util';
import { createAction, props } from '@ngrx/store';

// --- Data load ---
export const getData = createAction('[State] Get Data');
export const getDataSuccess = createAction(
  '[State] Get Data Success',
  props<{ data: DatabaseDto }>()
);
export const getDataFailure = createAction(
  '[State] Get Data Failure',
  props<{ error: string }>()
);
// Dispatched instead of re-fetching when cached data is still fresh.
export const getDataCached = createAction('[State] Get Data Cached');

// --- Portfolio management ---
export const createPortfolio = createAction(
  '[State] Create Portfolio',
  props<{ name: string }>()
);
export const createPortfolioSuccess = createAction(
  '[State] Create Portfolio Success',
  props<{ data: DatabaseDto }>()
);
export const createPortfolioFailure = createAction(
  '[State] Create Portfolio Failure',
  props<{ error: string }>()
);

export const renamePortfolio = createAction(
  '[State] Rename Portfolio',
  props<{ portfolioId: string; newName: string }>()
);
export const renamePortfolioSuccess = createAction(
  '[State] Rename Portfolio Success',
  props<{ data: DatabaseDto }>()
);
export const renamePortfolioFailure = createAction(
  '[State] Rename Portfolio Failure',
  props<{ error: string }>()
);

export const deletePortfolio = createAction(
  '[State] Delete Portfolio',
  props<{ portfolioId: string }>()
);
export const deletePortfolioSuccess = createAction(
  '[State] Delete Portfolio Success',
  props<{ data: DatabaseDto }>()
);
export const deletePortfolioFailure = createAction(
  '[State] Delete Portfolio Failure',
  props<{ error: string }>()
);

// --- Transaction operations (portfolio-scoped) ---
export const saveTransaction = createAction(
  '[State] Save Transaction',
  props<{ portfolioId: string; transaction: Transaction }>()
);
export const saveTransactionSuccess = createAction(
  '[State] Save Transaction Success',
  props<{ data: DatabaseDto }>()
);
export const saveTransactionFailure = createAction(
  '[State] Save Transaction Failure',
  props<{ error: string }>()
);

export const deleteTransaction = createAction(
  '[State] Delete Transaction',
  props<{ portfolioId: string; transactionKey: TransactionKey }>()
);
export const deleteTransactionSuccess = createAction(
  '[State] Delete Transaction Success',
  props<{ data: DatabaseDto }>()
);
export const deleteTransactionFailure = createAction(
  '[State] Delete Transaction Failure',
  props<{ error: string }>()
);

export const updateTransaction = createAction(
  '[State] Update Transaction',
  props<{ portfolioId: string; originalKey: TransactionKey; transaction: Transaction }>()
);
export const updateTransactionSuccess = createAction(
  '[State] Update Transaction Success',
  props<{ data: DatabaseDto }>()
);
export const updateTransactionFailure = createAction(
  '[State] Update Transaction Failure',
  props<{ error: string }>()
);

export const renameHolding = createAction(
  '[State] Rename Holding',
  props<{ portfolioId: string; oldTicker: string; newTicker: string }>()
);
export const renameHoldingSuccess = createAction(
  '[State] Rename Holding Success',
  props<{ data: DatabaseDto }>()
);
export const renameHoldingFailure = createAction(
  '[State] Rename Holding Failure',
  props<{ error: string }>()
);

// Atomic holding edit: renames the ticker and/or sets the currency in a single
// document write. Used by the holding-edit dialog so changing both at once can't
// race two separate full-document PUTs against each other.
export const updateHolding = createAction(
  '[State] Update Holding',
  props<{ portfolioId: string; oldTicker: string; newTicker: string; currency: string }>()
);
export const updateHoldingSuccess = createAction(
  '[State] Update Holding Success',
  props<{ data: DatabaseDto }>()
);
export const updateHoldingFailure = createAction(
  '[State] Update Holding Failure',
  props<{ error: string }>()
);

export const changeHoldingCurrency = createAction(
  '[State] Change Holding Currency',
  props<{ portfolioId: string; ticker: string; currency: string }>()
);
export const changeHoldingCurrencySuccess = createAction(
  '[State] Change Holding Currency Success',
  props<{ data: DatabaseDto }>()
);
export const changeHoldingCurrencyFailure = createAction(
  '[State] Change Holding Currency Failure',
  props<{ error: string }>()
);

export const deleteAllTransactions = createAction(
  '[State] Delete All Transactions',
  props<{ portfolioId: string }>()
);
export const deleteAllTransactionsSuccess = createAction(
  '[State] Delete All Transactions Success',
  props<{ data: DatabaseDto }>()
);
export const deleteAllTransactionsFailure = createAction(
  '[State] Delete All Transactions Failure',
  props<{ error: string }>()
);

// --- CSV imports ---
export const importDeGiroCsv = createAction(
  '[State] Import DeGiro CSV',
  props<{ portfolioId: string; data: CsvInput | CsvInputEnglish; mode: 'replace' | 'merge' }>()
);
export const importDeGiroCsvSuccess = createAction(
  '[State] Import DeGiro CSV Success',
  props<{ data: DatabaseDto }>()
);
export const importDeGiroCsvFailure = createAction(
  '[State] Import DeGiro CSV Failure',
  props<{ error: string }>()
);

export const importYahooCsv = createAction(
  '[State] Import Yahoo CSV',
  props<{ portfolioId: string; rawRows: unknown[]; mode: 'replace' | 'merge' }>()
);
// Dispatched after CSV parsing; carries the raw TransactionsDbo before
// currency resolution. yahoo.effects intercepts this to fill in currencies.
export const importYahooCsvParsed = createAction(
  '[State] Import Yahoo CSV Parsed',
  props<{ portfolioId: string; mode: 'replace' | 'merge'; incoming: TransactionsDbo }>()
);
// Dispatched by yahoo.effects after currency resolution; triggers the DB save.
export const importYahooCsvReady = createAction(
  '[State] Import Yahoo CSV Ready',
  props<{ portfolioId: string; mode: 'replace' | 'merge'; incoming: TransactionsDbo }>()
);
export const importYahooCsvSuccess = createAction(
  '[State] Import Yahoo CSV Success',
  props<{ data: DatabaseDto }>()
);
export const importYahooCsvFailure = createAction(
  '[State] Import Yahoo CSV Failure',
  props<{ error: string }>()
);

// --- Dashboard UI filter (not persisted) ---
export const setSelectedPortfolios = createAction(
  '[State] Set Selected Portfolios',
  props<{ ids: string[] | 'all' }>()
);

export const setTimeRange = createAction(
  '[State] Set Time Range',
  props<{ range: TimeRange }>()
);

// --- Settings ---
export const updateSettings = createAction(
  '[State] Update Settings',
  props<{ settings: UserSettingsDbo }>()
);
export const updateSettingsSuccess = createAction(
  '[State] Update Settings Success',
  props<{ data: DatabaseDto }>()
);
export const updateSettingsFailure = createAction(
  '[State] Update Settings Failure',
  props<{ error: string }>()
);

// --- Yahoo price data ---
export const setChartData = createAction(
  '[State] Set Chart Data',
  props<{ tickers: { [ticker: string]: Ticker } }>()
);

// Legacy action kept for backward compat with handleFileInput dispatch sites.
// Internally mapped to importDeGiroCsv for the "default" portfolio.
export const handleFileInput = createAction(
  '[State] Handle File Input',
  props<{ data: CsvInput | CsvInputEnglish }>()
);
export const handleFileInputSuccess = createAction(
  '[State] Handle File InputSuccess',
  props<{ data: DatabaseDto }>()
);
export const handleFileInputFailure = createAction(
  '[State] Handle File InputFailure',
  props<{ error: string }>()
);
