import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { NgxEchartsModule } from 'ngx-echarts';
import { LandingPageComponent } from './landing-page.component';
import { APP_ICONS } from '../icons';

// jsdom has no ResizeObserver; ngx-echarts needs one to render.
class ResizeObserverStub {
  observe(): void {
    /* noop */
  }
  unobserve(): void {
    /* noop */
  }
  disconnect(): void {
    /* noop */
  }
}

describe('LandingPageComponent', () => {
  let component: LandingPageComponent;
  let fixture: ComponentFixture<LandingPageComponent>;

  beforeEach(async () => {
    (global as unknown as { ResizeObserver: unknown }).ResizeObserver =
      ResizeObserverStub;

    await TestBed.configureTestingModule({
      imports: [
        LandingPageComponent,
        LucideAngularModule.pick(APP_ICONS),
        NgxEchartsModule.forRoot({ echarts: () => import('echarts') }),
      ],
      providers: [provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(LandingPageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('exposes a hero chart series from the demo data', () => {
    expect(component.heroChartX.length).toBeGreaterThan(0);
    expect(component.heroChartX.length).toBe(component.heroChartY.length);
  });
});
