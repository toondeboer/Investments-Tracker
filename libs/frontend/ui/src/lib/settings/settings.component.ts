import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Store } from '@ngrx/store';
import { selectBaseCurrency, updateSettings } from '@aws/state';

const SUPPORTED_CURRENCIES = ['EUR', 'USD'];

@Component({
  selector: 'aws-settings',
  templateUrl: './settings.component.html',
  styleUrls: ['./settings.component.scss'],
  imports: [CommonModule, FormsModule],
})
export class SettingsComponent implements OnInit {
  currencies = SUPPORTED_CURRENCIES;
  selectedCurrency = 'EUR';

  constructor(private store: Store) {}

  ngOnInit() {
    this.store.select(selectBaseCurrency).subscribe((currency) => {
      this.selectedCurrency = currency;
    });
  }

  onCurrencyChange(currency: string) {
    this.store.dispatch(updateSettings({ settings: { baseCurrency: currency } }));
  }
}
