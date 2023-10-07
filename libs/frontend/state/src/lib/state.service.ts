import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { DatabaseObject, Transaction, TransactionsAttributes } from '@aws/util';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class StateService {
  baseUrl = `https://42zobgj5c7.execute-api.us-east-1.amazonaws.com/default/microservice`;
  constructor(private http: HttpClient) {}

  public getData(): Observable<DatabaseObject> {
    return this.http.get<DatabaseObject>(`${this.baseUrl}`);
  }

  public saveTransaction(
    transaction: Transaction
  ): Observable<TransactionsAttributes> {
    return this.http.put<TransactionsAttributes>(`${this.baseUrl}`, {
      TableName: 'table',
      Key: {
        partitionKey: 'pk-test',
      },
      UpdateExpression: 'set transactions = list_append(transactions, :t)',
      ExpressionAttributeValues: {
        ':t': [transaction],
      },
      ReturnValues: 'ALL_NEW',
    });
  }

  public setTransactions(
    transactions: Transaction[]
  ): Observable<TransactionsAttributes> {
    return this.http.put<TransactionsAttributes>(`${this.baseUrl}`, {
      TableName: 'table',
      Key: {
        partitionKey: 'pk-test',
      },
      UpdateExpression: 'set transactions = :t',
      ExpressionAttributeValues: {
        ':t': transactions,
      },
      ReturnValues: 'ALL_NEW',
    });
  }
}
