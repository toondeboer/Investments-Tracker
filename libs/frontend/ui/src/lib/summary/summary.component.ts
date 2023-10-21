import { Component, Input } from '@angular/core';
import { Summary } from '@aws/util';

@Component({
  selector: 'aws-summary',
  templateUrl: './summary.component.html',
  styleUrls: ['./summary.component.scss'],
})
export class SummaryComponent {
  @Input() summary: Summary = {
    portfolioValue: 0,
    totalInvested: 0,
    amountOfShares: 0,
    averageSharePrice: 0,
    currentSharePrice: 0,
    totalDividend: 0,
    totalCommission: 0,
    dailyReturn: {
      absolute: 0,
      percentage: 0,
    },
    weeklyReturn: {
      absolute: 0,
      percentage: 0,
    },
    monthlyReturn: {
      absolute: 0,
      percentage: 0,
    },
    totalReturn: {
      absolute: 0,
      percentage: 0,
    },
  };
}
