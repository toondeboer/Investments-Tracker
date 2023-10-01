import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class StateService {
  baseUrl = `https://9nkhnv3wvc.execute-api.us-east-1.amazonaws.com/default/function`;
  constructor(private http: HttpClient) {}

  public getData(): Observable<string> {
    return this.http.get<string>(`${this.baseUrl}`);
  }
}
