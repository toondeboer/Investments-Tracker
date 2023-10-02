import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DashboardComponent } from './dashboard/dashboard.component';
import { NgxEchartsModule } from 'ngx-echarts';

@NgModule({
  imports: [CommonModule, NgxEchartsModule],
  declarations: [DashboardComponent],
})
export class UiModule {}
