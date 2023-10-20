import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import {
  DatabaseObject,
  Transactions,
  TransactionsAttributes,
} from '@aws/util';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class StateService {
  baseUrl = `https://42zobgj5c7.execute-api.us-east-1.amazonaws.com/default/microservice`;
  constructor(private http: HttpClient) {}

  public getData(): Observable<DatabaseObject> {
    console.log('AWS LAMBDA CALL');
    return this.http.get<DatabaseObject>(`${this.baseUrl}`);
  }

  public setTransactions(
    transactions: Transactions
  ): Observable<TransactionsAttributes> {
    console.log('AWS LAMBDA CALL');
    console.log(transactions);
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
