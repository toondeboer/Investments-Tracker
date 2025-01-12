import { HttpClient } from '@angular/common/http';
import { Inject, Injectable } from '@angular/core';
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
  constructor(
    @Inject('ENVIRONMENT') private environment: any,
    private http: HttpClient
  ) {}

  public getData(): Observable<DatabaseObject> {
    console.log('AWS LAMBDA CALL');
    return this.http.get<DatabaseObject>(
      `${this.environment.dynamoDBLambdaUrl}`
    );
  }

  public setTransactions(
    transactions: Transactions
  ): Observable<TransactionsAttributes> {
    console.log('AWS LAMBDA CALL');
    console.log(transactions);
    return this.http.put<TransactionsAttributes>(
      `${this.environment.dynamoDBLambdaUrl}`,
      {
        TableName: 'table',
        Key: {
          partitionKey: 'pk-test',
        },
        UpdateExpression: 'set transactions = :t',
        ExpressionAttributeValues: {
          ':t': transactions,
        },
        ReturnValues: 'ALL_NEW',
      }
    );
  }
}
