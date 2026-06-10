import { StateService } from './../state.service';
import { HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { ToastService } from '../toast.service';
import { Store } from '@ngrx/store';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { switchMap, catchError, of, map, tap, withLatestFrom } from 'rxjs';
import {
  changeHoldingCurrency,
  changeHoldingCurrencyFailure,
  changeHoldingCurrencySuccess,
  createPortfolio,
  deleteHolding,
  deleteHoldingFailure,
  deleteHoldingSuccess,
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
  importYahooCsvParsed,
  importYahooCsvReady,
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
  updateHolding,
  updateHoldingFailure,
  updateHoldingSuccess,
  updateSettings,
  updateSettingsFailure,
  updateSettingsSuccess,
  updateTransaction,
  updateTransactionFailure,
  updateTransactionSuccess,
} from './state.actions';
import { selectFeature, selectLastFetched } from './state.selectors';
import {
  DatabaseDto,
  PortfolioDbo,
  applyTransactionEdit,
  deleteHoldingTicker,
  getHoldingCurrency,
  matchesTransactionKey,
  mergeTransactions,
  parseCsvInput,
  parseYahooCsvInput,
  renameHoldingTicker,
  setHoldingCurrency,
  transactionToTransactionDbo,
  translateToDutch,
} from '@aws/util';

const GET_DATA_CACHE_MS = 30_000;

const EMPTY_TRANSACTIONS = { stock: [], dividend: [], commission: [] };

@Injectable()
export class StateEffects {
  private store = inject(Store);
  private readonly actions$ = inject(Actions);
  private readonly service = inject(StateService);
  private readonly toastService = inject(ToastService);

  public readonly showError$ = createEffect(
    () =>
      this.actions$.pipe(
        ofType(
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
          deleteHoldingFailure,
          deleteAllTransactionsFailure,
          importDeGiroCsvFailure,
          importYahooCsvFailure,
          handleFileInputFailure,
          updateSettingsFailure,
        ),
        tap(({ error }) =>
          this.toastService.open(error || 'Something went wrong', 'Dismiss', {
            duration: 6000,
          }),
        ),
      ),
    { dispatch: false },
  );

  public readonly getData$ = createEffect(() =>
    this.actions$.pipe(
      ofType(getData),
      withLatestFrom(this.store.select(selectLastFetched)),
      switchMap(([, lastFetched]) => {
        if (
          lastFetched !== null &&
          Date.now() - lastFetched < GET_DATA_CACHE_MS
        ) {
          return of(getDataCached());
        }
        return this.service.getData().pipe(
          map((data) => getDataSuccess({ data })),
          catchError((error: HttpErrorResponse) =>
            of(getDataFailure({ error: error.message })),
          ),
        );
      }),
    ),
  );

  public readonly createPortfolio$ = createEffect(() =>
    this.actions$.pipe(
      ofType(createPortfolio),
      withLatestFrom(this.store.select(selectFeature)),
      switchMap(([{ name }, state]) => {
        const newPortfolio: PortfolioDbo = {
          id: crypto.randomUUID(),
          name,
          transactions: EMPTY_TRANSACTIONS,
        };
        return this.service
          .setData(
            buildPayload(state, state.portfoliosDbo.concat(newPortfolio)),
          )
          .pipe(
            map((data) => createPortfolioSuccess({ data })),
            catchError((error: HttpErrorResponse) =>
              of(createPortfolioFailure({ error: error.message })),
            ),
          );
      }),
    ),
  );

  public readonly renamePortfolio$ = createEffect(() =>
    this.actions$.pipe(
      ofType(renamePortfolio),
      withLatestFrom(this.store.select(selectFeature)),
      switchMap(([{ portfolioId, newName }, state]) => {
        const updated = state.portfoliosDbo.map((p) =>
          p.id === portfolioId ? { ...p, name: newName } : p,
        );
        return this.service.setData(buildPayload(state, updated)).pipe(
          map((data) => renamePortfolioSuccess({ data })),
          catchError((error: HttpErrorResponse) =>
            of(renamePortfolioFailure({ error: error.message })),
          ),
        );
      }),
    ),
  );

  public readonly deletePortfolio$ = createEffect(() =>
    this.actions$.pipe(
      ofType(deletePortfolio),
      withLatestFrom(this.store.select(selectFeature)),
      switchMap(([{ portfolioId }, state]) => {
        const updated = state.portfoliosDbo.filter((p) => p.id !== portfolioId);
        return this.service.setData(buildPayload(state, updated)).pipe(
          map((data) => deletePortfolioSuccess({ data })),
          catchError((error: HttpErrorResponse) =>
            of(deletePortfolioFailure({ error: error.message })),
          ),
        );
      }),
    ),
  );

  public readonly saveTransaction$ = createEffect(() =>
    this.actions$.pipe(
      ofType(saveTransaction),
      withLatestFrom(this.store.select(selectFeature)),
      switchMap(([{ portfolioId, transaction }, state]) => {
        const updated = state.portfoliosDbo.map((p) => {
          if (p.id !== portfolioId) return p;
          // Holdings are single-currency: coerce to the holding's existing
          // currency if one is already set for this ticker.
          const holdingCurrency = getHoldingCurrency(
            p.transactions,
            transaction.ticker,
          );
          const dbo = {
            ...transactionToTransactionDbo(transaction),
            currency: holdingCurrency ?? transaction.currency,
          };
          const typeKey = transaction.type as
            | 'stock'
            | 'dividend'
            | 'commission';
          return {
            ...p,
            transactions: {
              ...p.transactions,
              [typeKey]: [...p.transactions[typeKey], dbo],
            },
          };
        });
        return this.service.setData(buildPayload(state, updated)).pipe(
          map((data) => saveTransactionSuccess({ data })),
          catchError((error: HttpErrorResponse) =>
            of(saveTransactionFailure({ error: error.message })),
          ),
        );
      }),
    ),
  );

  public readonly deleteTransaction$ = createEffect(() =>
    this.actions$.pipe(
      ofType(deleteTransaction),
      withLatestFrom(this.store.select(selectFeature)),
      switchMap(([{ portfolioId, transactionKey }, state]) => {
        const updated = state.portfoliosDbo.map((p) => {
          if (p.id !== portfolioId) return p;
          const filterOut = (txs: typeof p.transactions.stock) =>
            txs.filter((tx) => !matchesTransactionKey(tx, transactionKey));
          return {
            ...p,
            transactions: {
              stock: filterOut(p.transactions.stock),
              dividend: filterOut(p.transactions.dividend),
              commission: filterOut(p.transactions.commission),
            },
          };
        });
        return this.service.setData(buildPayload(state, updated)).pipe(
          map((data) => deleteTransactionSuccess({ data })),
          catchError((error: HttpErrorResponse) =>
            of(deleteTransactionFailure({ error: error.message })),
          ),
        );
      }),
    ),
  );

  public readonly updateTransaction$ = createEffect(() =>
    this.actions$.pipe(
      ofType(updateTransaction),
      withLatestFrom(this.store.select(selectFeature)),
      switchMap(([{ portfolioId, originalKey, transaction }, state]) => {
        const updated = state.portfoliosDbo.map((p) => {
          if (p.id !== portfolioId) return p;
          // Holdings are single-currency: coerce to the holding's existing
          // currency (computed before the edit is applied).
          const holdingCurrency = getHoldingCurrency(
            p.transactions,
            transaction.ticker,
          );
          const dbo = {
            ...transactionToTransactionDbo(transaction),
            currency: holdingCurrency ?? transaction.currency,
          };
          return {
            ...p,
            transactions: applyTransactionEdit(
              p.transactions,
              originalKey,
              dbo,
            ),
          };
        });
        return this.service.setData(buildPayload(state, updated)).pipe(
          map((data) => updateTransactionSuccess({ data })),
          catchError((error: HttpErrorResponse) =>
            of(updateTransactionFailure({ error: error.message })),
          ),
        );
      }),
    ),
  );

  public readonly renameHolding$ = createEffect(() =>
    this.actions$.pipe(
      ofType(renameHolding),
      withLatestFrom(this.store.select(selectFeature)),
      switchMap(([{ portfolioId, oldTicker, newTicker }, state]) => {
        const updated = state.portfoliosDbo.map((p) =>
          p.id === portfolioId
            ? {
                ...p,
                transactions: renameHoldingTicker(
                  p.transactions,
                  oldTicker,
                  newTicker,
                ),
              }
            : p,
        );
        return this.service.setData(buildPayload(state, updated)).pipe(
          map((data) => renameHoldingSuccess({ data })),
          catchError((error: HttpErrorResponse) =>
            of(renameHoldingFailure({ error: error.message })),
          ),
        );
      }),
    ),
  );

  public readonly updateHolding$ = createEffect(() =>
    this.actions$.pipe(
      ofType(updateHolding),
      withLatestFrom(this.store.select(selectFeature)),
      switchMap(([{ portfolioId, oldTicker, newTicker, currency }, state]) => {
        const updated = state.portfoliosDbo.map((p) => {
          if (p.id !== portfolioId) return p;
          // Rename first, then set the currency on the (possibly renamed) ticker
          // — a single transactions object, one document write.
          const renamed = renameHoldingTicker(
            p.transactions,
            oldTicker,
            newTicker,
          );
          return {
            ...p,
            transactions: setHoldingCurrency(renamed, newTicker, currency),
          };
        });
        return this.service.setData(buildPayload(state, updated)).pipe(
          map((data) => updateHoldingSuccess({ data })),
          catchError((error: HttpErrorResponse) =>
            of(updateHoldingFailure({ error: error.message })),
          ),
        );
      }),
    ),
  );

  public readonly changeHoldingCurrency$ = createEffect(() =>
    this.actions$.pipe(
      ofType(changeHoldingCurrency),
      withLatestFrom(this.store.select(selectFeature)),
      switchMap(([{ portfolioId, ticker, currency }, state]) => {
        const updated = state.portfoliosDbo.map((p) =>
          p.id === portfolioId
            ? {
                ...p,
                transactions: setHoldingCurrency(
                  p.transactions,
                  ticker,
                  currency,
                ),
              }
            : p,
        );
        return this.service.setData(buildPayload(state, updated)).pipe(
          map((data) => changeHoldingCurrencySuccess({ data })),
          catchError((error: HttpErrorResponse) =>
            of(changeHoldingCurrencyFailure({ error: error.message })),
          ),
        );
      }),
    ),
  );

  public readonly deleteHolding$ = createEffect(() =>
    this.actions$.pipe(
      ofType(deleteHolding),
      withLatestFrom(this.store.select(selectFeature)),
      switchMap(([{ portfolioId, ticker }, state]) => {
        const updated = state.portfoliosDbo.map((p) =>
          p.id === portfolioId
            ? {
                ...p,
                transactions: deleteHoldingTicker(p.transactions, ticker),
              }
            : p,
        );
        return this.service.setData(buildPayload(state, updated)).pipe(
          map((data) => deleteHoldingSuccess({ data })),
          catchError((error: HttpErrorResponse) =>
            of(deleteHoldingFailure({ error: error.message })),
          ),
        );
      }),
    ),
  );

  public readonly deleteAllTransactions$ = createEffect(() =>
    this.actions$.pipe(
      ofType(deleteAllTransactions),
      withLatestFrom(this.store.select(selectFeature)),
      switchMap(([{ portfolioId }, state]) => {
        const updated = state.portfoliosDbo.map((p) =>
          p.id === portfolioId ? { ...p, transactions: EMPTY_TRANSACTIONS } : p,
        );
        return this.service.setData(buildPayload(state, updated)).pipe(
          map((data) => deleteAllTransactionsSuccess({ data })),
          catchError((error: HttpErrorResponse) =>
            of(deleteAllTransactionsFailure({ error: error.message })),
          ),
        );
      }),
    ),
  );

  public readonly importDeGiroCsv$ = createEffect(() =>
    this.actions$.pipe(
      ofType(importDeGiroCsv),
      withLatestFrom(this.store.select(selectFeature)),
      switchMap(([{ portfolioId, data, mode }, state]) => {
        let parsed;
        try {
          parsed = parseCsvInput(translateToDutch(data));
        } catch (error) {
          const message =
            error instanceof Error ? error.message : 'Failed to parse CSV file';
          return of(importDeGiroCsvFailure({ error: message }));
        }

        const incoming = {
          stock: parsed.stock.map(transactionToTransactionDbo),
          dividend: parsed.dividend.map(transactionToTransactionDbo),
          commission: parsed.commission.map(transactionToTransactionDbo),
        };

        const updated = state.portfoliosDbo.map((p) => {
          if (p.id !== portfolioId) return p;
          const transactions =
            mode === 'replace'
              ? incoming
              : mergeTransactions(p.transactions, incoming);
          return { ...p, transactions };
        });

        return this.service.setData(buildPayload(state, updated)).pipe(
          map((data) => importDeGiroCsvSuccess({ data })),
          catchError((error: HttpErrorResponse) =>
            of(importDeGiroCsvFailure({ error: error.message })),
          ),
        );
      }),
    ),
  );

  // Parse the CSV and hand off to yahoo.effects for currency resolution.
  public readonly importYahooCsv$ = createEffect(() =>
    this.actions$.pipe(
      ofType(importYahooCsv),
      switchMap(({ portfolioId, rawRows, mode }) => {
        let incoming;
        try {
          incoming = parseYahooCsvInput(rawRows);
        } catch (error) {
          const message =
            error instanceof Error
              ? error.message
              : 'Failed to parse Yahoo Finance CSV';
          return of(importYahooCsvFailure({ error: message }));
        }
        return of(importYahooCsvParsed({ portfolioId, mode, incoming }));
      }),
    ),
  );

  // Persist the transactions once currencies have been resolved by yahoo.effects.
  public readonly importYahooCsvReady$ = createEffect(() =>
    this.actions$.pipe(
      ofType(importYahooCsvReady),
      withLatestFrom(this.store.select(selectFeature)),
      switchMap(([{ portfolioId, mode, incoming }, state]) => {
        const updated = state.portfoliosDbo.map((p) => {
          if (p.id !== portfolioId) return p;
          const transactions =
            mode === 'replace'
              ? incoming
              : mergeTransactions(p.transactions, incoming);
          return { ...p, transactions };
        });
        return this.service.setData(buildPayload(state, updated)).pipe(
          map((data) => importYahooCsvSuccess({ data })),
          catchError((error: HttpErrorResponse) =>
            of(importYahooCsvFailure({ error: error.message })),
          ),
        );
      }),
    ),
  );

  // Legacy handleFileInput: applies DeGiro CSV to the "default" portfolio in
  // replace mode. Kept for backward compat with existing dispatch sites.
  public readonly handleFileInput$ = createEffect(() =>
    this.actions$.pipe(
      ofType(handleFileInput),
      withLatestFrom(this.store.select(selectFeature)),
      switchMap(([{ data }, state]) => {
        let parsed;
        try {
          parsed = parseCsvInput(translateToDutch(data));
        } catch (error) {
          const message =
            error instanceof Error ? error.message : 'Failed to parse CSV file';
          return of(handleFileInputFailure({ error: message }));
        }

        const incoming = {
          stock: parsed.stock.map(transactionToTransactionDbo),
          dividend: parsed.dividend.map(transactionToTransactionDbo),
          commission: parsed.commission.map(transactionToTransactionDbo),
        };

        // Find "default" portfolio or first one.
        const targetId =
          state.portfoliosDbo.find((p) => p.id === 'default')?.id ??
          state.portfoliosDbo[0]?.id;

        const updated = state.portfoliosDbo.map((p) =>
          p.id === targetId ? { ...p, transactions: incoming } : p,
        );

        return this.service.setData(buildPayload(state, updated)).pipe(
          map((d) => handleFileInputSuccess({ data: d })),
          catchError((error: HttpErrorResponse) =>
            of(handleFileInputFailure({ error: error.message })),
          ),
        );
      }),
    ),
  );

  public readonly updateSettings$ = createEffect(() =>
    this.actions$.pipe(
      ofType(updateSettings),
      withLatestFrom(this.store.select(selectFeature)),
      switchMap(([{ settings }, state]) => {
        return this.service
          .setData({
            portfolios: state.portfoliosDbo,
            settings,
            schemaVersion: 2,
          })
          .pipe(
            map((data) => updateSettingsSuccess({ data })),
            catchError((error: HttpErrorResponse) =>
              of(updateSettingsFailure({ error: error.message })),
            ),
          );
      }),
    ),
  );
}

function buildPayload(
  state: { portfoliosDbo: PortfolioDbo[]; settings: { baseCurrency: string } },
  portfolios: PortfolioDbo[],
): DatabaseDto {
  return {
    portfolios,
    settings: state.settings,
    schemaVersion: 2,
  };
}
