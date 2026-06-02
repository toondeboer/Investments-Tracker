import { TestBed } from '@angular/core/testing';
import { provideMockStore, MockStore } from '@ngrx/store/testing';
import { Store } from '@ngrx/store';
import { setSelectedPortfolios, setTimeRange } from '@aws/state';
import { DashboardComponent } from './dashboard.component';

describe('DashboardComponent', () => {
  let component: DashboardComponent;
  let store: MockStore;
  let dispatch: jest.SpyInstance;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DashboardComponent],
      providers: [provideMockStore()],
    }).compileComponents();

    const fixture = TestBed.createComponent(DashboardComponent);
    component = fixture.componentInstance;
    store = TestBed.inject(MockStore);
    dispatch = jest.spyOn(store, 'dispatch');
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('selectRange', () => {
    it('dispatches setTimeRange with the chosen range', () => {
      component.selectRange('1Y');
      expect(dispatch).toHaveBeenCalledWith(setTimeRange({ range: '1Y' }));
    });
  });

  describe('togglePortfolio', () => {
    it('deselects one of "all" -> array of the rest', () => {
      component.togglePortfolio('p2', 'all', ['p1', 'p2', 'p3']);
      expect(dispatch).toHaveBeenCalledWith(setSelectedPortfolios({ ids: ['p1', 'p3'] }));
    });

    it('re-adding the last missing one collapses back to "all"', () => {
      component.togglePortfolio('p3', ['p1', 'p2'], ['p1', 'p2', 'p3']);
      expect(dispatch).toHaveBeenCalledWith(setSelectedPortfolios({ ids: 'all' }));
    });

    it('adds a portfolio to an existing partial selection', () => {
      component.togglePortfolio('p2', ['p1'], ['p1', 'p2', 'p3']);
      expect(dispatch).toHaveBeenCalledWith(setSelectedPortfolios({ ids: ['p1', 'p2'] }));
    });
  });

  describe('isPortfolioActive', () => {
    it('is true for every portfolio when selection is "all"', () => {
      expect(component.isPortfolioActive('anything', 'all')).toBe(true);
    });

    it('reflects membership of an explicit selection', () => {
      expect(component.isPortfolioActive('p1', ['p1'])).toBe(true);
      expect(component.isPortfolioActive('p2', ['p1'])).toBe(false);
    });
  });

  describe('currencySymbol', () => {
    it('maps USD to $ and everything else to €', () => {
      expect(component.currencySymbol('USD')).toBe('$');
      expect(component.currencySymbol('EUR')).toBe('€');
      expect(component.currencySymbol(null)).toBe('€');
      expect(component.currencySymbol(undefined)).toBe('€');
    });
  });
});
