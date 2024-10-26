import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BarChartPerQuarterByYear } from './bar-chart-per-quarter-by-year';

describe('BarChartComponent', () => {
  let component: BarChartPerQuarterByYear;
  let fixture: ComponentFixture<BarChartPerQuarterByYear>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [BarChartPerQuarterByYear],
    }).compileComponents();

    fixture = TestBed.createComponent(BarChartPerQuarterByYear);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
