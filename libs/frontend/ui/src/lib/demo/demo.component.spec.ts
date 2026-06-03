import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideMockStore } from '@ngrx/store/testing';
import { NgxEchartsModule } from 'ngx-echarts';
import { DemoComponent } from './demo.component';

describe('DemoComponent', () => {
  it('should create with static demo data', async () => {
    await TestBed.configureTestingModule({
      imports: [
        DemoComponent,
        NgxEchartsModule.forRoot({ echarts: () => import('echarts') }),
      ],
      providers: [provideRouter([]), provideMockStore()],
    }).compileComponents();

    const fixture = TestBed.createComponent(DemoComponent);
    const component = fixture.componentInstance;

    expect(component).toBeTruthy();
    expect(component.dates.length).toBe(component.portfolioValues.length);
    expect(component.summary.portfolioValue).toBeGreaterThan(0);
  });
});
