import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

export interface DatabaseObject {
  Items: [
    {
      partitionKey: string;
      data: string;
    }
  ];
}

@Injectable({
  providedIn: 'root',
})
export class StateService {
  baseUrl = `https://42zobgj5c7.execute-api.us-east-1.amazonaws.com/default/microservice`;
  constructor(private http: HttpClient) {}

  public getData(): Observable<DatabaseObject> {
    return this.http.get<DatabaseObject>(`${this.baseUrl}`);
  }

  public putData(): Observable<DatabaseObject> {
    return this.http.post<DatabaseObject>(
      `${this.baseUrl}`,
      {
        TableName: 'table',
        Item: {
          partitionKey: 'pk-test',
          data: 'test12345',
        },
      },
      { headers: { 'Content-Type': 'application/json' } }
    );
  }
}
