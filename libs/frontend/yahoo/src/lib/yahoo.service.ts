import { HttpClient } from '@angular/common/http';
import { Inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { Stock, YahooObject } from '@aws/util';

@Injectable({
  providedIn: 'root',
})
export class YahooService {
  constructor(
    @Inject('ENVIRONMENT') private environment: any,
    private http: HttpClient
  ) {}

  public getTicker(name: string, startDate: Date): Observable<YahooObject> {
    console.log('AWS LAMBDA CALL');
    const start = Math.floor(startDate.getTime() / 1000);
    const end = Math.ceil(new Date().getTime() / 1000);
    const body = {
      symbol: name,
      start: start,
      end: end,
    };
    return this.http.post<YahooObject>(this.environment.yahooLambdaUrl, body);
  }

  public getTickers(
    names: string[],
    startDate: Date
  ): Observable<YahooObject[]> {
    console.log('AWS LAMBDA CALL MULTIPLE TICKERS: ', names);
    const start = Math.floor(startDate.getTime() / 1000);
    const end = Math.ceil(new Date().getTime() / 1000);
    const body = {
      symbols: names,
      start: start,
      end: end,
    };
    return this.http.post<YahooObject[]>(this.environment.yahooLambdaUrl, body);
  }
}
