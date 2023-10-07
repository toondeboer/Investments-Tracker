export type Transaction = {
  date: Date;
  amount: number;
  value: number;
};

export type ChartData = {
  x: string[];
  data: number[];
};

export interface DatabaseObject {
  Items: [
    {
      partitionKey: string;
      transactions: {
        date: string;
        amount: number;
        value: number;
      }[];
    }
  ];
}
