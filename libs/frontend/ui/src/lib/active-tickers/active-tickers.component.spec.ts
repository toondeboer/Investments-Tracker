import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ChartData, TransactionChartData } from '@aws/util';
import { ActiveTickersComponent } from './active-tickers.component';

function emptyTxData(): TransactionChartData {
  return { transactionValues: [], aggregatedValues: [], transactionAmounts: [], aggregatedAmounts: [] };
}

function chartData(portfolioValues: number[], profit: number[]): ChartData {
  return {
    stock: emptyTxData(),
    dividend: {
      ...emptyTxData(),
      perQuarterByYear: [],
      perQuarter: { yearQuarters: [], dividends: [] },
      ttmPerQuarter: { yearQuarters: [], dividends: [] },
    },
    commission: emptyTxData(),
    portfolioValues,
    profit,
    yieldPerYear: { years: [], yields: [], profit: [] },
    allTimeDates: [],
    allTimePortfolioValues: [],
    allTimeInvested: [],
    allTimeProfit: [],
  };
}

describe('ActiveTickersComponent', () => {
  let component: ActiveTickersComponent;
  let fixture: ComponentFixture<ActiveTickersComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ActiveTickersComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(ActiveTickersComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('addChartDatas across mixed market calendars', () => {
    it('does not let one stock’s closed-day NaN void the combined value/profit', () => {
      // Stock A trades on day 0 (B closed -> NaN); stock B trades on day 1.
      const a = chartData([100, NaN], [10, NaN]);
      const b = chartData([NaN, 50], [NaN, 5]);

      const merged = component.addChartDatas(a, b);

      expect(merged.portfolioValues).toEqual([100, 50]);
      expect(merged.profit).toEqual([10, 5]);
      expect(merged.portfolioValues.some(Number.isNaN)).toBe(false);
    });
  });
});
