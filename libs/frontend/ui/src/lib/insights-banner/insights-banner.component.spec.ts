import { TestBed } from '@angular/core/testing';
import { provideMockStore, MockStore } from '@ngrx/store/testing';
import { selectState } from '@aws/state';
import {
  loadInsights,
  selectInsight,
  selectInsightLoading,
} from '@aws/captain';
import { LucideAngularModule } from 'lucide-angular';
import { APP_ICONS } from '../icons';
import { InsightsBannerComponent } from './insights-banner.component';

describe('InsightsBannerComponent', () => {
  let component: InsightsBannerComponent;
  let store: MockStore;
  let dispatch: jest.SpyInstance;

  function setup(portfolioValue: number) {
    TestBed.configureTestingModule({
      imports: [InsightsBannerComponent, LucideAngularModule.pick(APP_ICONS)],
      providers: [
        provideMockStore({
          selectors: [
            { selector: selectState, value: { summary: { portfolioValue } } },
          ],
        }),
      ],
    });
    const fixture = TestBed.createComponent(InsightsBannerComponent);
    component = fixture.componentInstance;
    store = TestBed.inject(MockStore);
    dispatch = jest.spyOn(store, 'dispatch');
  }

  it('dispatches the demo insight immediately in demo mode', () => {
    setup(0);
    component.demo = true;
    component.ngOnInit();
    expect(dispatch).toHaveBeenCalledWith(loadInsights({ demo: true }));
  });

  it('waits for a funded portfolio before asking (no spend on empty)', () => {
    setup(0);
    component.ngOnInit();
    expect(dispatch).not.toHaveBeenCalled();
  });

  it('asks for the insight once the portfolio has value', () => {
    setup(1234);
    component.ngOnInit();
    expect(dispatch).toHaveBeenCalledWith(loadInsights({}));
  });

  it('renders bold figures without asterisks and tints signed ones', () => {
    setup(1234);
    store.overrideSelector(selectInsightLoading, false);
    store.overrideSelector(selectInsight, {
      narrative:
        'value is **€42,153.34**; return is **+€5,192.08** but the week was **-€1,430.29**',
      generatedAt: '',
      fingerprint: 'test',
    });
    const fixture = TestBed.createComponent(InsightsBannerComponent);
    fixture.detectChanges();
    const text: string = fixture.nativeElement.textContent;
    expect(text).not.toContain('*');

    const positive = fixture.nativeElement.querySelector('.insight-positive');
    const negative = fixture.nativeElement.querySelector('.insight-negative');
    expect(positive?.textContent).toContain('+€5,192.08');
    expect(negative?.textContent).toContain('-€1,430.29');
  });
});
