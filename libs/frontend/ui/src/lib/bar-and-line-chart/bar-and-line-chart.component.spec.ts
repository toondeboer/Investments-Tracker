import { TestBed } from '@angular/core/testing';
import { EChartsOption } from 'echarts';
import { BarAndLineChartComponent } from './bar-and-line-chart.component';

describe('BarAndLineChartComponent', () => {
  it('should create', async () => {
    await TestBed.configureTestingModule({
      imports: [BarAndLineChartComponent],
    }).compileComponents();

    const fixture = TestBed.createComponent(BarAndLineChartComponent);
    expect(fixture.componentInstance).toBeTruthy();
  });

  describe('rate breakdown of the trailing-twelve-month dividend', () => {
    // Returns the data array for the named series after rendering £120 TTM.
    const seriesData = (name: string): number[] => {
      const component = new BarAndLineChartComponent();
      component.series = {
        yearQuarters: [{ year: '2023', quarter: 0 }],
        dividends: [120],
      };
      component.ngOnChanges();
      const series = (
        component.chartOptions as EChartsOption & {
          series: { name: string; data: number[] }[];
        }
      ).series;
      return series.find((s) => s.name === name)!.data;
    };

    it('shows the annual figure unchanged for "Yearly"', () => {
      expect(seriesData('Yearly')).toEqual([120]);
    });

    it('divides the annual figure by 12 for "Monthly"', () => {
      expect(seriesData('Monthly')).toEqual([10]);
    });

    it('divides the annual figure by 365 for "Daily"', () => {
      expect(seriesData('Daily')).toEqual([
        Math.round((120 / 365) * 100) / 100,
      ]);
    });

    it('divides the annual figure by hours-per-year for "Hourly"', () => {
      expect(seriesData('Hourly')).toEqual([
        Math.round((120 / (365 * 24)) * 100) / 100,
      ]);
    });
  });
});
