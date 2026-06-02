import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PortfolioDbo, Stock } from '@aws/util';
import { TransactionsTableComponent } from '../transactions-table/transactions-table.component';

@Component({
  selector: 'aws-portfolio-detail',
  templateUrl: './portfolio-detail.component.html',
  styleUrls: ['./portfolio-detail.component.scss'],
  imports: [CommonModule, TransactionsTableComponent],
})
export class PortfolioDetailComponent {
  @Input() portfolio: PortfolioDbo | null = null;
  @Input() stocks: { [ticker: string]: Stock } = {};
  @Input() baseCurrency = 'EUR';

  @Output() importCsv = new EventEmitter<string>();

  get portfolioId(): string {
    return this.portfolio?.id ?? 'default';
  }
}
