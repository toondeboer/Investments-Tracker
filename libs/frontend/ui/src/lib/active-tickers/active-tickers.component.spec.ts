import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActiveTickersComponent } from './active-tickers.component';

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
});
