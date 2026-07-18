import { Component, OnInit, inject } from '@angular/core';

import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Store } from '@ngrx/store';
import { LucideAngularModule } from 'lucide-angular';
import { selectBaseCurrency, updateSettings } from '@aws/state';

const SUPPORTED_CURRENCIES = ['EUR', 'USD'];

@Component({
  selector: 'aws-settings',
  templateUrl: './settings.component.html',
  styleUrls: ['./settings.component.scss'],
  imports: [FormsModule, LucideAngularModule],
})
export class SettingsComponent implements OnInit {
  private store = inject(Store);
  private readonly router = inject(Router);

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

  logout(): void {
    window.sessionStorage.clear();
    this.router.navigate(['/login']);
  }
}
