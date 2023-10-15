export type Summary = {
  portfolioValue: number;
  totalInvested: number;
  amountOfShares: number;
  averageSharePrice: number;
  currentSharePrice: number;
};

export type ChartData = {
  transactionAmounts: number[];
  transactionValues: number[];
  aggregatedAmounts: number[];
  aggregatedValues: number[];
  portfolioValues: number[];
  profit: number[];
};

export type Transaction = {
  date: Date;
  amount: number;
  value: number;
};

export type TransactionDbo = {
  date: string;
  amount: number;
  value: number;
};

export type DatabaseObject = {
  Items: [
    {
      partitionKey: string;
      transactions: TransactionDbo[];
    }
  ];
};

export type TransactionsAttributes = {
  Attributes: {
    transactions: TransactionDbo[];
  };
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
