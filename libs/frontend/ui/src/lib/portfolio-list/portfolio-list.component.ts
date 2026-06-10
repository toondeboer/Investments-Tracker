import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule, CurrencyPipe } from '@angular/common';
import { LucideAngularModule } from 'lucide-angular';
import { PortfolioDbo, Summary } from '@aws/util';

@Component({
  selector: 'aws-portfolio-list',
  templateUrl: './portfolio-list.component.html',
  styleUrls: ['./portfolio-list.component.scss'],
  imports: [CommonModule, LucideAngularModule, CurrencyPipe],
})
export class PortfolioListComponent {
  @Input() portfolios: PortfolioDbo[] = [];
  @Input() selectedPortfolioId: string | null = null;
  @Input() portfolioStates: { [id: string]: { summary: Summary } } | null =
    null;
  @Input() baseCurrency = 'EUR';

  @Output() selectPortfolio = new EventEmitter<string>();
  @Output() createPortfolio = new EventEmitter<void>();
  @Output() renamePortfolio = new EventEmitter<PortfolioDbo>();
  @Output() deletePortfolio = new EventEmitter<PortfolioDbo>();

  transactionCount(portfolio: PortfolioDbo): number {
    return (
      portfolio.transactions.stock.length +
      portfolio.transactions.dividend.length +
      portfolio.transactions.commission.length
    );
  }
}
