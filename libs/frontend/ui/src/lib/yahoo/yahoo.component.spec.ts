import { ComponentFixture, TestBed } from '@angular/core/testing';
import { YahooComponent } from './yahoo.component';

describe('YahooComponent', () => {
  let component: YahooComponent;
  let fixture: ComponentFixture<YahooComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [YahooComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(YahooComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
