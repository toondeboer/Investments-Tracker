import { TestBed } from '@angular/core/testing';
import { provideMockActions } from '@ngrx/effects/testing';
import { provideMockStore, MockStore } from '@ngrx/store/testing';
import { Observable, of, take, throwError } from 'rxjs';
import { Action } from '@ngrx/store';
import { HttpErrorResponse } from '@angular/common/http';
import { selectBaseCurrency, selectState } from '@aws/state';
import { CaptainEffects } from './captain.effects';
import { CaptainService } from '../captain.service';
import { selectMessages } from './captain.selectors';
import {
  loadInsights,
  loadInsightsFailure,
  loadInsightsSuccess,
  loadStatus,
  loadStatusSuccess,
  sendMessage,
  sendMessageFailure,
  sendMessageSuccess,
} from './captain.actions';
import { buildCaptainSummary } from '../captain-summary';
import { demoChatReply, DEMO_INSIGHT } from '../captain.demo';
import { insightFingerprint, writeCachedInsight } from '../insights-cache';

const ret = (a: number, p: number) => ({ absolute: a, percentage: p });

const state = {
  transactions: { stock: [], dividend: [], commission: [] },
  dates: [],
  currencies: ['EUR'],
  summary: {
    portfolioValue: 1000,
    totalInvested: 800,
    totalDividend: 0,
    totalCommission: 0,
    startDate: new Date('2024-01-01'),
    dailyReturn: ret(0, 0),
    weeklyReturn: ret(0, 0),
    monthlyReturn: ret(0, 0),
    totalReturn: ret(200, 25),
  },
  stocks: {},
} as any;

describe('CaptainEffects', () => {
  let actions$: Observable<Action>;
  let effects: CaptainEffects;
  let service: { chat: jest.Mock; insights: jest.Mock; status: jest.Mock };

  const usage = { plan: 'free', limit: 30, used: 1, remaining: 29 };

  function setup() {
    localStorage.clear();
    service = {
      chat: jest.fn().mockReturnValue(of({ reply: 'live chat reply', usage })),
      insights: jest.fn().mockReturnValue(of({ reply: 'live narrative', usage })),
      status: jest.fn().mockReturnValue(of(usage)),
    };
    TestBed.configureTestingModule({
      providers: [
        CaptainEffects,
        provideMockActions(() => actions$),
        provideMockStore(),
        { provide: CaptainService, useValue: service },
      ],
    });
    const store = TestBed.inject(MockStore);
    store.overrideSelector(selectMessages, [{ role: 'user', content: 'hi' }]);
    store.overrideSelector(selectState, state);
    store.overrideSelector(selectBaseCurrency, 'EUR');
    effects = TestBed.inject(CaptainEffects);
  }

  describe('sendMessage$', () => {
    it('serves a canned reply in demo mode without calling the service', (done) => {
      setup();
      actions$ = of(sendMessage({ content: 'Should I sell?', demo: true }));
      effects.sendMessage$.pipe(take(1)).subscribe((action) => {
        expect(action).toEqual(
          sendMessageSuccess({ reply: demoChatReply('Should I sell?') })
        );
        expect(service.chat).not.toHaveBeenCalled();
        done();
      });
    });

    it('calls the service with the thread + summary when not demo', (done) => {
      setup();
      actions$ = of(sendMessage({ content: 'How did I do?' }));
      effects.sendMessage$.pipe(take(1)).subscribe((action) => {
        expect(action).toEqual(
          sendMessageSuccess({ reply: 'live chat reply', usage })
        );
        expect(service.chat).toHaveBeenCalledTimes(1);
        done();
      });
    });

    it('maps a 429 to a quota-exceeded failure', (done) => {
      setup();
      service.chat.mockReturnValue(
        throwError(() => new HttpErrorResponse({ status: 429, statusText: 'Too Many Requests' }))
      );
      actions$ = of(sendMessage({ content: 'How did I do?' }));
      effects.sendMessage$.pipe(take(1)).subscribe((action: any) => {
        expect(action.type).toBe(sendMessageFailure.type);
        expect(action.quota).toBe(true);
        done();
      });
    });

    it('does not flag a non-429 error as a quota issue', (done) => {
      setup();
      service.chat.mockReturnValue(
        throwError(() => new HttpErrorResponse({ status: 500, statusText: 'Server Error' }))
      );
      actions$ = of(sendMessage({ content: 'How did I do?' }));
      effects.sendMessage$.pipe(take(1)).subscribe((action: any) => {
        expect(action.type).toBe(sendMessageFailure.type);
        expect(action.quota).toBe(false);
        done();
      });
    });
  });

  describe('loadInsights$', () => {
    it('returns the static demo insight without calling the service', (done) => {
      setup();
      actions$ = of(loadInsights({ demo: true }));
      effects.loadInsights$.pipe(take(1)).subscribe((action) => {
        expect(action).toEqual(loadInsightsSuccess({ insight: DEMO_INSIGHT }));
        expect(service.insights).not.toHaveBeenCalled();
        done();
      });
    });

    it('calls the service on a cache miss and stores the result', (done) => {
      setup();
      actions$ = of(loadInsights({}));
      effects.loadInsights$.pipe(take(1)).subscribe((action: any) => {
        expect(service.insights).toHaveBeenCalledTimes(1);
        expect(action.insight.narrative).toBe('live narrative');
        done();
      });
    });

    it('uses the cached insight on a same-day hit — no service call (no spend)', (done) => {
      setup();
      const fingerprint = insightFingerprint(buildCaptainSummary(state, 'EUR'));
      const cached = { narrative: 'cached read', generatedAt: '2026-06-03T00:00:00Z', fingerprint };
      writeCachedInsight(cached);

      actions$ = of(loadInsights({}));
      effects.loadInsights$.pipe(take(1)).subscribe((action) => {
        expect(action).toEqual(loadInsightsSuccess({ insight: cached }));
        expect(service.insights).not.toHaveBeenCalled();
        done();
      });
    });
  });

  describe('loadStatus$', () => {
    it('fetches the status snapshot and emits loadStatusSuccess', (done) => {
      setup();
      actions$ = of(loadStatus());
      effects.loadStatus$.pipe(take(1)).subscribe((action) => {
        expect(action).toEqual(loadStatusSuccess({ status: usage }));
        expect(service.status).toHaveBeenCalledTimes(1);
        done();
      });
    });
  });
});
