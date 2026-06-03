import { TestBed } from '@angular/core/testing';
import { provideMockStore, MockStore } from '@ngrx/store/testing';
import { selectState } from '@aws/state';
import { loadInsights } from '@aws/captain';
import { InsightsBannerComponent } from './insights-banner.component';

describe('InsightsBannerComponent', () => {
  let component: InsightsBannerComponent;
  let store: MockStore;
  let dispatch: jest.SpyInstance;

  function setup(portfolioValue: number) {
    TestBed.configureTestingModule({
      imports: [InsightsBannerComponent],
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
});
