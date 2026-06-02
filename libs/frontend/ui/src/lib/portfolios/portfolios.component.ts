import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Store } from '@ngrx/store';
import {
  createPortfolio,
  deletePortfolio,
  getData,
  importDeGiroCsv,
  importYahooCsv,
  renamePortfolio,
  selectAllPortfolioStates,
  selectBaseCurrency,
  selectPortfoliosDbo,
} from '@aws/state';
import { PortfolioDbo, Stock } from '@aws/util';
import { PortfolioListComponent } from '../portfolio-list/portfolio-list.component';
import { PortfolioDetailComponent } from '../portfolio-detail/portfolio-detail.component';
import {
  PortfolioNameDialogComponent,
  PortfolioNameDialogData,
} from '../portfolio-name-dialog/portfolio-name-dialog.component';
import {
  ConfirmDialogComponent,
  ConfirmDialogData,
} from '../confirm-dialog/confirm-dialog.component';
import {
  CsvUploadDialogComponent,
  CsvUploadDialogData,
  CsvUploadResult,
} from '../csv-upload-dialog/csv-upload-dialog.component';
import { DialogService } from '../dialog/dialog.service';

@Component({
  selector: 'aws-portfolios',
  templateUrl: './portfolios.component.html',
  styleUrls: ['./portfolios.component.scss'],
  imports: [CommonModule, PortfolioListComponent, PortfolioDetailComponent],
})
export class PortfoliosComponent implements OnInit {
  portfolios$ = this.store.select(selectPortfoliosDbo);
  allPortfolioStates$ = this.store.select(selectAllPortfolioStates);
  baseCurrency$ = this.store.select(selectBaseCurrency);
  selectedPortfolioId: string | null = null;

  constructor(private store: Store, private dialog: DialogService) {}

  ngOnInit() {
    this.store.dispatch(getData());
    this.portfolios$.subscribe((portfolios) => {
      if (portfolios.length > 0 && !this.selectedPortfolioId) {
        this.selectedPortfolioId = portfolios[0].id;
      }
    });
  }

  getSelectedPortfolio(portfolios: PortfolioDbo[]): PortfolioDbo | null {
    return portfolios.find((p) => p.id === this.selectedPortfolioId) ?? null;
  }

  getSelectedPortfolioStocks(
    allStates: { [id: string]: { stocks: { [ticker: string]: Stock } } } | null
  ): { [ticker: string]: Stock } {
    if (!allStates || !this.selectedPortfolioId) return {};
    return allStates[this.selectedPortfolioId]?.stocks ?? {};
  }

  onSelectPortfolio(id: string) {
    this.selectedPortfolioId = id;
  }

  onCreatePortfolio() {
    const data: PortfolioNameDialogData = { title: 'New portfolio' };
    this.dialog
      .open(PortfolioNameDialogComponent, { data, width: '380px' })
      .afterClosed()
      .subscribe((name) => {
        if (name) {
          this.store.dispatch(createPortfolio({ name: name as string }));
        }
      });
  }

  onRenamePortfolio(portfolio: PortfolioDbo) {
    const data: PortfolioNameDialogData = {
      title: 'Rename portfolio',
      initialName: portfolio.name,
    };
    this.dialog
      .open(PortfolioNameDialogComponent, { data, width: '380px' })
      .afterClosed()
      .subscribe((newName) => {
        if (newName) {
          this.store.dispatch(
            renamePortfolio({ portfolioId: portfolio.id, newName: newName as string })
          );
        }
      });
  }

  onDeletePortfolio(portfolio: PortfolioDbo) {
    const data: ConfirmDialogData = {
      title: 'Delete portfolio',
      message: `Delete "${portfolio.name}"? This will permanently remove all its transactions.`,
    };
    this.dialog
      .open(ConfirmDialogComponent, { data, width: '380px' })
      .afterClosed()
      .subscribe((confirmed) => {
        if (confirmed) {
          if (this.selectedPortfolioId === portfolio.id) {
            this.selectedPortfolioId = null;
          }
          this.store.dispatch(deletePortfolio({ portfolioId: portfolio.id }));
        }
      });
  }

  onImportCsv(portfolioId: string) {
    const data: CsvUploadDialogData = { portfolioId };
    this.dialog
      .open(CsvUploadDialogComponent, { data, width: '460px' })
      .afterClosed()
      .subscribe((result) => {
        const csvResult = result as CsvUploadResult | undefined;
        if (!csvResult) return;
        if (csvResult.format === 'degiro') {
          this.store.dispatch(
            importDeGiroCsv({ portfolioId: csvResult.portfolioId, data: csvResult.rows as any, mode: csvResult.mode })
          );
        } else {
          this.store.dispatch(
            importYahooCsv({ portfolioId: csvResult.portfolioId, rawRows: csvResult.rows, mode: csvResult.mode })
          );
        }
      });
  }
}
