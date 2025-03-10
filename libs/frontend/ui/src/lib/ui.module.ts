import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DashboardComponent } from './dashboard/dashboard.component';
import { NgxEchartsModule } from 'ngx-echarts';
import { ChartComponent } from './chart/chart.component';
import { UtilModule } from '@aws/util';
import { TransactionsTableComponent } from './transactions-table/transactions-table.component';
import { FormsModule } from '@angular/forms';
import { YahooComponent } from './yahoo/yahoo.component';
import { SummaryComponent } from './summary/summary.component';
import { PageWrapperComponent } from './page-wrapper/page-wrapper.component';
import { RouterModule } from '@angular/router';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatListModule } from '@angular/material/list';
import { MatButtonModule } from '@angular/material/button';
import { TransactionsComponent } from './transactions/transactions.component';
import { ScrollingTextComponent } from './scrolling-text/scrolling-text.component';
import { BarChartPerQuarterByYear } from './bar-chart-per-quarter-by-year/bar-chart-per-quarter-by-year';
import { BarAndLineChartComponent } from './bar-and-line-chart/bar-and-line-chart.component';
import { BarChartComponent } from './bar-chart/bar-chart.component';

@NgModule({
  imports: [
    CommonModule,
    RouterModule,
    NgxEchartsModule,
    UtilModule,
    FormsModule,
    MatToolbarModule,
    MatSidenavModule,
    MatListModule,
    MatButtonModule,
  ],
})
export class UiModule {}
