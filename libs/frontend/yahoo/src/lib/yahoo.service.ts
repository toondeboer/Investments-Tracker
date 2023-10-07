import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { DatabaseObject, YahooObject } from '@aws/util';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class YahooService {
  baseUrl = `https://42zobgj5c7.execute-api.us-east-1.amazonaws.com/default/yahoo_finance`;
  constructor(private http: HttpClient) {}

  public getTicker(ticker: string): Observable<YahooObject> {
    console.log('yahoo service');
    return this.http.get<YahooObject>(
      `${this.baseUrl}?symbol=${ticker}&start=1643670000&end=1696685533422`
    );
  }
}
