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
};

export type ChartData = {
  stock: TransactionChartData;
  dividend: DividendTransactionChartData;
  commission: TransactionChartData;
  portfolioValues: number[];
  profit: number[];
  yieldPerYear: { years: string[]; yields: number[]; profit: number[] };
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
  amount: number;
  value: number;
};

export type DatabaseDto = {
  startDate: string;
  transactions: TransactionsDbo;
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
  amount: number;
  value: number;
};

export type YahooObject = {
  symbol: string;
  data: {
    chart: {
      result: [
        {
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
              }
            ];
            adjclose: [{ adjclose: number[] }];
          };
        }
      ];
    };
  };
};

export type Ticker = {
  name: string;
  dates: Date[];
  values: number[];
};

export type CsvInput = {
  Datum: string;
  Product: string;
  Omschrijving: string;
  '': string;
}[];

export type CsvInputEnglish = {
  Date: string;
  Product: string;
  Description: string;
  '': string;
}[];

export type YearQuarter = {
  year: string;
  quarter: number;
};
