import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { TickerRequest, YahooObject } from '@aws/util';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class YahooService {
  baseUrl = `https://42zobgj5c7.execute-api.us-east-1.amazonaws.com/default/yahoo_finance`;
  constructor(private http: HttpClient) {}

  public getTicker(tickerRequest: TickerRequest): Observable<YahooObject> {
    console.log('yahoo service');
    const start = Math.floor(tickerRequest.startDate.getTime() / 1000);
    const end = Math.ceil(tickerRequest.endDate.getTime() / 1000);
    console.log(start);
    console.log(end);
    return this.http.get<YahooObject>(
      `${this.baseUrl}?symbol=${tickerRequest.name}&start=${start}&end=${end}`
    );
  }
}
