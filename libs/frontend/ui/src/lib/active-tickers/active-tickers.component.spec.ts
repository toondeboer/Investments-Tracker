import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ChartData, TransactionChartData } from '@aws/util';
import { ActiveTickersComponent } from './active-tickers.component';

function emptyTxData(): TransactionChartData {
  return {
    transactionValues: [],
    aggregatedValues: [],
    transactionAmounts: [],
    aggregatedAmounts: [],
  };
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

  describe('addChartDatas across multiple stocks', () => {
    it('sums portfolio values and profit element-wise', () => {
      // getPortfolioValues forward-fills closed days at the source, so all
      // series are continuous by the time they are aggregated here.
      const a = chartData([100, 100], [10, 10]);
      const b = chartData([50, 60], [5, 8]);

      const merged = component.addChartDatas(a, b);

      expect(merged.portfolioValues).toEqual([150, 160]);
      expect(merged.profit).toEqual([15, 18]);
    });
  });
});
