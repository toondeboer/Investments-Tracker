export type Transaction = {
  date: Date;
  amount: number;
  value: number;
};

export type ChartData = {
  x: string[];
  data: number[];
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
