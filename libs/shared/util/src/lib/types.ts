export type Summary = {
  portfolioValue: number;
  totalInvested: number;
  totalDividend: number;
  totalCommission: number;
  startDate: Date;
  dailyReturn: Return;
  weeklyReturn: Return;
  monthlyReturn: Return;
  totalReturn: Return;
};

export type Return = {
  absolute: number;
  percentage: number;
};

export type StockSummary = {
  portfolioValue: number;
  totalInvested: number;
  totalDividend: number;
  totalCommission: number;
  amountOfShares: number;
  averageSharePrice: number;
  currentSharePrice: number;
  dailyReturn: Return;
  weeklyReturn: Return;
  monthlyReturn: Return;
  totalReturn: Return;
};

export type Stock = {
  ticker: string;
  transactions: Transactions;
  summary: StockSummary;
  chartData: ChartData;
  currency: { value: string };
};

export type ChartData = {
  stock: TransactionChartData;
  dividend: DividendTransactionChartData;
  commission: TransactionChartData;
  portfolioValues: number[];
  profit: number[];
  yieldPerYear: { years: string[]; yields: number[]; profit: number[] };
  // Full-history monthly data (independent of selected range) for the annual
  // return / dividend charts.
  allTimeDates: Date[];
  allTimePortfolioValues: number[];
  allTimeInvested: number[];
  allTimeProfit: number[];
};

export type TransactionChartData = {
  transactionValues: number[];
  aggregatedValues: number[];
  transactionAmounts: number[];
  aggregatedAmounts: number[];
};

export interface DividendTransactionChartData extends TransactionChartData {
  perQuarterByYear: { year: string; data: number[] }[];
  perQuarter: { yearQuarters: YearQuarter[]; dividends: number[] };
  ttmPerQuarter: { yearQuarters: YearQuarter[]; dividends: number[] };
}

export type TransactionType = 'stock' | 'dividend' | 'commission';

export type Transactions = {
  stock: Transaction[];
  dividend: Transaction[];
  commission: Transaction[];
};

export type Transaction = {
  ticker: string;
  type: TransactionType;
  date: Date;
  time?: string;
  amount: number;
  // Native value, in the transaction's own `currency`.
  value: number;
  currency: string;
  // Value converted into the display/base currency at this transaction's own
  // date's FX rate (spot-at-purchase). Set by the engine when a display currency
  // differs from the holding currency; undefined means "show the native value".
  convertedValue?: number;
};

export type TransactionKey = {
  type: TransactionType;
  ticker: string;
  date: string;
  time?: string;
  value: number;
};

// Legacy v1 shape — kept for schema migration only.
export type DatabaseDtoV1 = {
  startDate: string;
  transactions: TransactionsDbo;
};

export type UserSettingsDbo = {
  baseCurrency: string;
};

export type PortfolioDbo = {
  id: string;
  name: string;
  transactions: TransactionsDbo;
};

export type DatabaseDto = {
  portfolios: PortfolioDbo[];
  settings: UserSettingsDbo;
  schemaVersion: 2;
};

export type TransactionsDbo = {
  stock: TransactionDbo[];
  dividend: TransactionDbo[];
  commission: TransactionDbo[];
};

export type TransactionDbo = {
  ticker: string;
  type: string;
  date: string;
  time?: string;
  amount: number;
  value: number;
  currency: string;
};

export type TimeRange = '1M' | '3M' | '6M' | 'YTD' | '1Y' | '5Y' | 'ALL';
export type ChartGranularity = 'daily' | 'weekly' | 'monthly';

export const TIME_RANGE_LABELS: Record<TimeRange, string> = {
  '1M': '1M',
  '3M': '3M',
  '6M': '6M',
  YTD: 'YTD',
  '1Y': '1Y',
  '5Y': '5Y',
  ALL: 'All',
};

export type YahooObject = {
  symbol: string;
  data: {
    chart: {
      result: [
        {
          events?: {
            dividends: {
              [timestamp: string]: { amount: number; date: number };
            };
          };
          meta: {
            currency: string;
            symbol: string;
          };
          timestamp: number[];
          indicators: {
            quote: [
              {
                low: number[];
                high: number[];
                volume: number[];
                close: number[];
                open: number[];
              },
            ];
            adjclose: [{ adjclose: number[] }];
          };
        },
      ];
    };
  };
};

export type Ticker = {
  name: string;
  currency: string;
  dates: Date[];
  values: number[];
  dividends: { date: Date; amountPerShare: number }[];
};

export type CsvInput = {
  Datum: string;
  Tijd?: string;
  Product: string;
  Omschrijving: string;
  '': string;
}[];

export type CsvInputEnglish = {
  Date: string;
  Time?: string;
  Product: string;
  Description: string;
  '': string;
}[];

export type YearQuarter = {
  year: string;
  quarter: number;
};
