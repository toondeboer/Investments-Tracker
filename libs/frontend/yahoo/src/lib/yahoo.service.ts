import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { map, Observable, timeout } from 'rxjs';
import {
  parseYahooObjects,
  retryWithBackoff,
  Stock,
  YahooObject,
  YAHOO_TIMEOUT_MS,
} from '@aws/util';

@Injectable({
  providedIn: 'root',
})
export class YahooService {
  private environment = inject<any>('ENVIRONMENT' as any);
  private http = inject(HttpClient);

  public getTicker(name: string, startDate: Date): Observable<YahooObject> {
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
    startDate: Date,
    currencies: string[],
  ): Observable<YahooObject[]> {
    const start = Math.floor(startDate.getTime() / 1000);
    const end = Math.ceil(new Date().getTime() / 1000);
    const body = {
      symbols: [...names, ...currencies],
      start: start,
      end: end,
    };
    return this.http.post<unknown>(this.environment.yahooLambdaUrl, body).pipe(
      timeout(YAHOO_TIMEOUT_MS),
      retryWithBackoff(),
      map((response) => parseYahooObjects(response)),
    );
  }
}
