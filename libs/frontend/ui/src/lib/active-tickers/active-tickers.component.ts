import { Component, Input, OnChanges } from '@angular/core';

import {
  addLists,
  addPerQuarterByYearLists,
  ChartData,
  getYieldPerYear,
  Stock,
} from '@aws/util';
import { YahooComponent } from '../yahoo/yahoo.component';

@Component({
  selector: 'aws-active-tickers',
  imports: [YahooComponent],
  templateUrl: './active-tickers.component.html',
  styleUrl: './active-tickers.component.scss',
})
export class ActiveTickersComponent implements OnChanges {
  @Input() dates: Date[] = [];
  @Input() stocks: { [ticker: string]: Stock } | undefined;
  @Input() currencySymbol = '€';

  tickers: string[] = [];
  activeStocks: string[] = [];
  activeChartData: ChartData | undefined;

  ngOnChanges() {
    if (this.stocks) {
      this.tickers = Object.keys(this.stocks);
      this.activeStocks = this.tickers;
      this.activeChartData = this.getActiveChartData();
    }
  }

  toggleTicker(ticker: string) {
    if (this.activeStocks.includes(ticker)) {
      this.activeStocks = this.activeStocks.filter((v) => v !== ticker);
    } else {
      this.activeStocks = [...this.activeStocks, ticker];
    }
    this.activeChartData = this.getActiveChartData();
  }

  getActiveChartData(): ChartData | undefined {
    if (this.activeStocks.length == 0 || !this.stocks) {
      return undefined;
    }
    let chartData = this.stocks[this.activeStocks[0]].chartData;

    for (let i = 1; i < this.activeStocks.length; i++) {
      chartData = this.addChartDatas(
        chartData,
        this.stocks[this.activeStocks[i]].chartData
      );
    }

    return chartData;
  }

  addChartDatas(chartData1: ChartData, chartData2: ChartData): ChartData {
    // getPortfolioValues forward-fills closed days at the source, so all series
    // are continuous — no NaN to guard against when summing.
    const portfolioValues = addLists(
      chartData1.portfolioValues,
      chartData2.portfolioValues
    );
    const profit = addLists(chartData1.profit, chartData2.profit);

    // Merge full-history data (same monthly dates for all stocks in the portfolio).
    const allTimeDates = chartData1.allTimeDates;
    const allTimePortfolioValues = addLists(chartData1.allTimePortfolioValues, chartData2.allTimePortfolioValues);
    const allTimeInvested = addLists(chartData1.allTimeInvested, chartData2.allTimeInvested);
    const allTimeProfit = addLists(chartData1.allTimeProfit, chartData2.allTimeProfit);

    // Cumulative dividends per all-time date, summed across the active stocks —
    // the dividend term in the per-year annual return.
    const allTimeDividends = addLists(
      chartData1.dividend.aggregatedValues,
      chartData2.dividend.aggregatedValues
    );

    return {
      stock: {
        transactionValues: addLists(
          chartData1.stock.transactionValues,
          chartData2.stock.transactionValues,
          true
        ),
        aggregatedValues: addLists(
          chartData1.stock.aggregatedValues,
          chartData2.stock.aggregatedValues
        ),
        transactionAmounts: addLists(
          chartData1.stock.transactionAmounts,
          chartData2.stock.transactionAmounts,
          true
        ),
        aggregatedAmounts: addLists(
          chartData1.stock.aggregatedAmounts,
          chartData2.stock.aggregatedAmounts
        ),
      },
      dividend: {
        transactionValues: addLists(
          chartData1.dividend.transactionValues,
          chartData2.dividend.transactionValues,
          true
        ),
        aggregatedValues: addLists(
          chartData1.dividend.aggregatedValues,
          chartData2.dividend.aggregatedValues
        ),
        transactionAmounts: addLists(
          chartData1.dividend.transactionAmounts,
          chartData2.dividend.transactionAmounts
        ),
        aggregatedAmounts: addLists(
          chartData1.dividend.aggregatedAmounts,
          chartData2.dividend.aggregatedAmounts
        ),
        perQuarterByYear: addPerQuarterByYearLists(
          chartData1.dividend.perQuarterByYear,
          chartData2.dividend.perQuarterByYear
        ),
        perQuarter: {
          yearQuarters: chartData1.dividend.perQuarter.yearQuarters,
          dividends: addLists(
            chartData1.dividend.perQuarter.dividends,
            chartData2.dividend.perQuarter.dividends
          ),
        },
        ttmPerQuarter: {
          yearQuarters: chartData1.dividend.ttmPerQuarter.yearQuarters,
          dividends: addLists(
            chartData1.dividend.ttmPerQuarter.dividends,
            chartData2.dividend.ttmPerQuarter.dividends
          ),
        },
      },
      commission: {
        transactionValues: addLists(
          chartData1.commission.transactionValues,
          chartData2.commission.transactionValues
        ),
        aggregatedValues: addLists(
          chartData1.commission.aggregatedValues,
          chartData2.commission.aggregatedValues
        ),
        transactionAmounts: addLists(
          chartData1.commission.transactionAmounts,
          chartData2.commission.transactionAmounts
        ),
        aggregatedAmounts: addLists(
          chartData1.commission.aggregatedAmounts,
          chartData2.commission.aggregatedAmounts
        ),
      },
      portfolioValues,
      profit,
      allTimeDates,
      allTimePortfolioValues,
      allTimeInvested,
      allTimeProfit,
      // Annual return per year always computed from full-history monthly data
      // regardless of the selected range.
      yieldPerYear: getYieldPerYear(
        allTimeDates,
        allTimePortfolioValues,
        allTimeInvested,
        allTimeDividends
      ),
    };
  }
}
