import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DashboardComponent } from './dashboard/dashboard.component';
import { NgxEchartsModule } from 'ngx-echarts';
import { ChartComponent } from './chart/chart.component';
import { UtilModule } from '@aws/util';

@NgModule({
  imports: [CommonModule, NgxEchartsModule, UtilModule],
  declarations: [DashboardComponent, ChartComponent],
})
export class UiModule {}
