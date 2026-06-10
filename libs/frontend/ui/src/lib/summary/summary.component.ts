import { Component, Input } from '@angular/core';
import { Summary } from '@aws/util';
import { CommonModule, DecimalPipe, NgClass } from '@angular/common';

@Component({
  selector: 'aws-summary',
  templateUrl: './summary.component.html',
  styleUrls: ['./summary.component.scss'],
  imports: [NgClass, DecimalPipe, CommonModule],
})
export class SummaryComponent {
  @Input() currency = 'EUR';
  @Input() summary: Summary | null | undefined = null;

  get safeSummary(): Summary {
    return (
      this.summary ?? {
        portfolioValue: 0,
        totalInvested: 0,
        totalDividend: 0,
        totalCommission: 0,
        startDate: new Date(),
        dailyReturn: { absolute: 0, percentage: 0 },
        weeklyReturn: { absolute: 0, percentage: 0 },
        monthlyReturn: { absolute: 0, percentage: 0 },
        totalReturn: { absolute: 0, percentage: 0 },
      }
    );
  }
}
