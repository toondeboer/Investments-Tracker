import { Component, OnInit, inject } from '@angular/core';

import { FormsModule } from '@angular/forms';
import { Store } from '@ngrx/store';
import { selectBaseCurrency, updateSettings } from '@aws/state';

const SUPPORTED_CURRENCIES = ['EUR', 'USD'];

@Component({
  selector: 'aws-settings',
  templateUrl: './settings.component.html',
  styleUrls: ['./settings.component.scss'],
  imports: [FormsModule],
})
export class SettingsComponent implements OnInit {
  private store = inject(Store);

  currencies = SUPPORTED_CURRENCIES;
  selectedCurrency = 'EUR';

  ngOnInit() {
    this.store.select(selectBaseCurrency).subscribe((currency) => {
      this.selectedCurrency = currency;
    });
  }

  onCurrencyChange(currency: string) {
    this.store.dispatch(
      updateSettings({ settings: { baseCurrency: currency } }),
    );
  }
}
