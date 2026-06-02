import { HttpErrorResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Store } from '@ngrx/store';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { switchMap, catchError, of, withLatestFrom, mergeMap, map } from 'rxjs';
import { YahooService } from '../yahoo.service';
import { getTickerFailure, getTickersSuccess } from './yahoo.actions';
import { yahooObjectsToTickers } from '@aws/util';
import {
  getDataSuccess,
  importYahooCsvFailure,
  importYahooCsvParsed,
  importYahooCsvReady,
  selectState,
  setChartData,
  ToastService,
} from '@aws/state';

@Injectable()
export class YahooEffects {
  constructor(
    private store: Store,
    private readonly actions$: Actions,
    private readonly service: YahooService,
    private readonly toastService: ToastService
  ) {}

  // Intercept the parsed Yahoo CSV to fetch each symbol's currency from Yahoo
  // before handing off to state.effects for the DB save.
  public readonly importYahooCsvResolveCurrencies$ = createEffect(() =>
    this.actions$.pipe(
      ofType(importYahooCsvParsed),
      switchMap(({ portfolioId, mode, incoming }) => {
        const unknownSymbols = [
          ...new Set([
            ...incoming.stock
              .filter((tx) => tx.currency === 'UNKNOWN')
              .map((tx) => tx.ticker),
            ...incoming.commission
              .filter((tx) => tx.currency === 'UNKNOWN')
              .map((tx) => tx.ticker),
          ]),
        ];

        if (unknownSymbols.length === 0) {
          return of(importYahooCsvReady({ portfolioId, mode, incoming }));
        }

        const recentDate = new Date();
        recentDate.setDate(recentDate.getDate() - 7);

        return this.service.getTickers(unknownSymbols, recentDate, []).pipe(
          map((yahooObjects) => {
            const currencyMap: { [symbol: string]: string } = {};
            for (const yo of yahooObjects) {
              currencyMap[yo.symbol] = yo.data.chart.result[0].meta.currency;
            }
            const resolved = {
              stock: incoming.stock.map((tx) =>
                tx.currency === 'UNKNOWN' && currencyMap[tx.ticker]
                  ? { ...tx, currency: currencyMap[tx.ticker] }
                  : tx
              ),
              dividend: incoming.dividend,
              commission: incoming.commission.map((tx) =>
                tx.currency === 'UNKNOWN' && currencyMap[tx.ticker]
                  ? { ...tx, currency: currencyMap[tx.ticker] }
                  : tx
              ),
            };
            return importYahooCsvReady({ portfolioId, mode, incoming: resolved });
          }),
          catchError((error: HttpErrorResponse) =>
            of(importYahooCsvFailure({ error: error.message }))
          )
        );
      })
    )
  );

  // On a fresh data load, fetch the latest prices for the held tickers and feed
  // them into the store. Save/delete/import don't refetch prices — the memoized
  // portfolio selector recomputes from the changed transactions using the
  // tickers already in the store.
  public readonly getTicker$ = createEffect(() =>
    this.actions$.pipe(
      ofType(getDataSuccess),
      withLatestFrom(this.store.select(selectState)),
      switchMap(([_, { stocks, summary, currencies }]) => {
        const requested = [...Object.keys(stocks), ...currencies];
        return this.service
          .getTickers(Object.keys(stocks), summary.startDate, currencies)
          .pipe(
            mergeMap((yahooObjects) => {
              const tickers = yahooObjectsToTickers(yahooObjects);
              // Surface symbols Yahoo failed to return (errors / malformed
              // payloads were dropped during parsing) instead of silently
              // rendering an incomplete chart.
              const returned = new Set(yahooObjects.map((y) => y.symbol));
              const missing = requested.filter((s) => !returned.has(s));
              if (missing.length > 0) {
                this.toastService.open(
                  `Couldn't load prices for: ${missing.join(', ')}`,
                  'Dismiss',
                  { duration: 6000 }
                );
              }
              return [getTickersSuccess({ tickers }), setChartData({ tickers })];
            }),
            catchError((error: HttpErrorResponse) =>
              of(getTickerFailure({ error: error.message }))
            )
          );
      })
    )
  );
}
