import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DashboardComponent } from './dashboard/dashboard.component';
import { NgxEchartsModule } from 'ngx-echarts';
import { ChartComponent } from './chart/chart.component';
import { UtilModule } from '@aws/util';
import { TransactionsTableComponent } from './transactions-table/transactions-table.component';
import { FormsModule } from '@angular/forms';
import { YahooComponent } from './yahoo/yahoo.component';

@NgModule({
  imports: [CommonModule, NgxEchartsModule, UtilModule, FormsModule],
  declarations: [
    DashboardComponent,
    ChartComponent,
    TransactionsTableComponent,
    YahooComponent,
  ],
})
export class UiModule {}
