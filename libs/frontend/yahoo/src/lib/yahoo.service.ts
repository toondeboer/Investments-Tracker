import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { YahooObject } from '@aws/util';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class YahooService {
  baseUrl = `https://42zobgj5c7.execute-api.us-east-1.amazonaws.com/default/yahoo_finance`;
  constructor(private http: HttpClient) {}

  public getTicker(name: string, startDate: Date): Observable<YahooObject> {
    console.log('AWS LAMBDA CALL');
    const start = Math.floor(startDate.getTime() / 1000);
    const end = Math.ceil(new Date().getTime() / 1000);
    return this.http.get<YahooObject>(
      `${this.baseUrl}?symbol=${name}&start=${start}&end=${end}`
    );
  }
}
