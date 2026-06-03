import { HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Store } from '@ngrx/store';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { catchError, map, of, switchMap, withLatestFrom } from 'rxjs';
import { selectBaseCurrency, selectState } from '@aws/state';
import { CaptainService } from '../captain.service';
import { buildCaptainSummary } from '../captain-summary';
import { demoChatReply, DEMO_INSIGHT } from '../captain.demo';
import {
  insightFingerprint,
  readCachedInsight,
  writeCachedInsight,
} from '../insights-cache';
import {
  loadInsights,
  loadInsightsFailure,
  loadInsightsSuccess,
  sendMessage,
  sendMessageFailure,
  sendMessageSuccess,
} from './captain.actions';
import { selectMessages } from './captain.selectors';

@Injectable()
export class CaptainEffects {
  private store = inject(Store);
  private readonly actions$ = inject(Actions);
  private readonly service = inject(CaptainService);

  // Send the (already-appended) thread + a compact portfolio summary to the
  // Lambda. Demo mode short-circuits to a canned reply — no network, no auth,
  // no spend.
  public readonly sendMessage$ = createEffect(() =>
    this.actions$.pipe(
      ofType(sendMessage),
      withLatestFrom(
        this.store.select(selectMessages),
        this.store.select(selectState),
        this.store.select(selectBaseCurrency)
      ),
      switchMap(([action, messages, state, currency]) => {
        if (action.demo) {
          return of(sendMessageSuccess({ reply: demoChatReply(action.content) }));
        }
        const summary = buildCaptainSummary(state, currency);
        return this.service.chat(messages, summary).pipe(
          map((reply) => sendMessageSuccess({ reply })),
          catchError((error: HttpErrorResponse) =>
            of(sendMessageFailure({ error: error.message }))
          )
        );
      })
    )
  );

  // Generate the dashboard "Captain's read", cached per day + portfolio so a
  // reload (or a same-day revisit) doesn't trigger another OpenAI call.
  public readonly loadInsights$ = createEffect(() =>
    this.actions$.pipe(
      ofType(loadInsights),
      withLatestFrom(
        this.store.select(selectState),
        this.store.select(selectBaseCurrency)
      ),
      switchMap(([action, state, currency]) => {
        if (action.demo) {
          return of(loadInsightsSuccess({ insight: DEMO_INSIGHT }));
        }
        const summary = buildCaptainSummary(state, currency);
        const fingerprint = insightFingerprint(summary);

        const cached = readCachedInsight();
        if (cached && cached.fingerprint === fingerprint) {
          return of(loadInsightsSuccess({ insight: cached }));
        }

        return this.service.insights(summary).pipe(
          map((narrative) => {
            const insight = {
              narrative,
              generatedAt: new Date().toISOString(),
              fingerprint,
            };
            writeCachedInsight(insight);
            return loadInsightsSuccess({ insight });
          }),
          catchError((error: HttpErrorResponse) =>
            of(loadInsightsFailure({ error: error.message }))
          )
        );
      })
    )
  );
}
