import { TestBed } from '@angular/core/testing';
import { provideMockActions } from '@ngrx/effects/testing';
import { provideMockStore, MockStore } from '@ngrx/store/testing';
import { Observable, of, take } from 'rxjs';
import { Action } from '@ngrx/store';
import { YahooEffects } from './yahoo.effects';
import { YahooService } from '../yahoo.service';
import { ToastService, getDataSuccess, selectState } from '@aws/state';
import { YahooObject } from '@aws/util';

function yahooObject(symbol: string): YahooObject {
  return {
    symbol,
    data: {
      chart: {
        result: [
          {
            meta: { currency: 'USD', symbol },
            timestamp: [1696550400],
            indicators: { quote: [{ close: [100] }] },
          },
        ],
      },
    },
  } as YahooObject;
}

describe('YahooEffects.getTicker$', () => {
  let actions$: Observable<Action>;
  let effects: YahooEffects;
  let toast: { open: jest.Mock };
  let service: { getTickers: jest.Mock };

  function setup(returnedSymbols: string[]) {
    toast = { open: jest.fn() };
    service = {
      getTickers: jest.fn().mockReturnValue(of(returnedSymbols.map(yahooObject))),
    };

    TestBed.configureTestingModule({
      providers: [
        YahooEffects,
        provideMockActions(() => actions$),
        provideMockStore(),
        { provide: YahooService, useValue: service },
        { provide: ToastService, useValue: toast },
      ],
    });

    const store = TestBed.inject(MockStore);
    store.overrideSelector(selectState, {
      stocks: { AAPL: {}, MSFT: {} },
      summary: { startDate: new Date('2023-01-01T00:00:00.000Z') },
      currencies: ['EUR=X'],
    } as any);

    effects = TestBed.inject(YahooEffects);
  }

  it('toasts the symbols Yahoo failed to return', (done) => {
    setup(['AAPL']); // MSFT and EUR=X are missing
    actions$ = of(getDataSuccess({ data: {} as any }));

    // The toast fires inside the mergeMap before any action is emitted, so it
    // has already been called by the first emission.
    effects.getTicker$.pipe(take(1)).subscribe(() => {
      expect(toast.open).toHaveBeenCalledTimes(1);
      const message = toast.open.mock.calls[0][0] as string;
      expect(message).toContain('MSFT');
      expect(message).toContain('EUR=X');
      expect(message).not.toContain('AAPL');
      done();
    });
  });

  it('does not toast when every requested symbol is returned', (done) => {
    setup(['AAPL', 'MSFT', 'EUR=X']);
    actions$ = of(getDataSuccess({ data: {} as any }));

    effects.getTicker$.pipe(take(1)).subscribe(() => {
      expect(toast.open).not.toHaveBeenCalled();
      done();
    });
  });
});
