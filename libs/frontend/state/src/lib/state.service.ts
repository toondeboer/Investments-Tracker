import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import {
  DatabaseDto,
  DYNAMODB_TIMEOUT_MS,
  parseDatabaseDto,
  retryWithBackoff,
} from '@aws/util';
import { map, Observable, timeout } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class StateService {
  private environment = inject<any>('ENVIRONMENT' as any);
  private http = inject(HttpClient);

  public getData(): Observable<DatabaseDto> {
    return this.http.get<unknown>(`${this.environment.dynamoDBLambdaUrl}`).pipe(
      timeout(DYNAMODB_TIMEOUT_MS),
      retryWithBackoff(),
      map((response) => parseDatabaseDto(response)),
    );
  }

  public setData(payload: DatabaseDto): Observable<DatabaseDto> {
    return this.http
      .put<unknown>(`${this.environment.dynamoDBLambdaUrl}`, payload)
      .pipe(
        timeout(DYNAMODB_TIMEOUT_MS),
        retryWithBackoff(),
        map((response) => parseDatabaseDto(response)),
      );
  }
}
