export type Summary = {
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

export type Return = {
  absolute: number;
  percentage: number;
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
  type: TransactionType;
  date: Date;
  amount: number;
  value: number;
};

export type DatabaseDto = {
  transactions: TransactionsDbo;
};

export type TransactionsDbo = {
  stock: TransactionDbo[];
  dividend: TransactionDbo[];
  commission: TransactionDbo[];
};

export type TransactionDbo = {
  type: string;
  date: string;
  amount: number;
  value: number;
};

export type YahooObject = {
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

export type Ticker = {
  name: string;
  dates: Date[];
  values: number[];
};

export type CsvInput = {
  Datum: string;
  Omschrijving: string;
  '': string;
}[];

export type CsvInputEnglish = {
  Date: string;
  Description: string;
  '': string;
}[];

export type YearQuarter = {
  year: string;
  quarter: number;
};
