import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { MockStore, provideMockStore } from '@ngrx/store/testing';
import { selectBaseCurrency, updateSettings } from '@aws/state';
import { SettingsComponent } from './settings.component';

describe('SettingsComponent', () => {
  let component: SettingsComponent;
  let router: { navigate: jest.Mock };
  let dispatch: jest.SpyInstance;

  beforeEach(async () => {
    router = { navigate: jest.fn() };
    await TestBed.configureTestingModule({
      imports: [SettingsComponent],
      providers: [
        provideMockStore({
          selectors: [{ selector: selectBaseCurrency, value: 'EUR' }],
        }),
        { provide: Router, useValue: router },
      ],
    }).compileComponents();

    const fixture = TestBed.createComponent(SettingsComponent);
    component = fixture.componentInstance;
    dispatch = jest.spyOn(TestBed.inject(MockStore), 'dispatch');
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('dispatches updateSettings on currency change', () => {
    component.onCurrencyChange('USD');
    expect(dispatch).toHaveBeenCalledWith(
      updateSettings({ settings: { baseCurrency: 'USD' } }),
    );
  });

  it('logout clears the session and navigates to login', () => {
    const clear = jest.spyOn(Storage.prototype, 'clear');
    component.logout();
    expect(clear).toHaveBeenCalled();
    expect(router.navigate).toHaveBeenCalledWith(['/login']);
    clear.mockRestore();
  });
});
