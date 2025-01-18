import { HttpClient } from '@angular/common/http';
import { Inject, Injectable } from '@angular/core';
import { DatabaseDto, Transactions } from '@aws/util';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class StateService {
  constructor(
    @Inject('ENVIRONMENT') private environment: any,
    private http: HttpClient
  ) {}

  public getData(): Observable<DatabaseDto> {
    console.log('AWS LAMBDA CALL');
    return this.http.get<DatabaseDto>(`${this.environment.dynamoDBLambdaUrl}`);
  }

  public setTransactions(transactions: Transactions): Observable<DatabaseDto> {
    console.log('AWS LAMBDA CALL');
    console.log(transactions);
    return this.http.put<DatabaseDto>(`${this.environment.dynamoDBLambdaUrl}`, {
      transactions,
    });
  }
}
