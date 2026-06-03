import { Component, EventEmitter, Input, Output, ViewChild } from '@angular/core';

import { PortfolioDbo, Stock } from '@aws/util';
import { LucideAngularModule } from 'lucide-angular';
import { TransactionsTableComponent } from '../transactions-table/transactions-table.component';

@Component({
  selector: 'aws-portfolio-detail',
  templateUrl: './portfolio-detail.component.html',
  styleUrls: ['./portfolio-detail.component.scss'],
  imports: [LucideAngularModule, TransactionsTableComponent],
})
export class PortfolioDetailComponent {
  @Input() portfolio: PortfolioDbo | null = null;
  @Input() stocks: { [ticker: string]: Stock } = {};
  @Input() baseCurrency = 'EUR';

  @Output() importCsv = new EventEmitter<string>();

  @ViewChild(TransactionsTableComponent) table?: TransactionsTableComponent;

  get portfolioId(): string {
    return this.portfolio?.id ?? 'default';
  }

  onAddHolding() {
    this.table?.onAddHolding();
  }
}
