import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BarAndLineChartComponent } from './bar-and-line-chart.component';

describe('BarAndLineChartComponent', () => {
  let component: BarAndLineChartComponent;
  let fixture: ComponentFixture<BarAndLineChartComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [BarAndLineChartComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(BarAndLineChartComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
