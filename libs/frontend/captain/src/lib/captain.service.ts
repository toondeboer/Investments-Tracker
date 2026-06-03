import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { map, Observable, timeout } from 'rxjs';
import { retryWithBackoff } from '@aws/util';
import { ChatMessage, CaptainSummary } from './captain.types';
import { parseCaptainReply } from './captain.schemas';

// The Captain Lambda calls OpenAI, which can be slower than the DynamoDB CRUD
// path; give it the same headroom as the Yahoo fan-out.
const CAPTAIN_TIMEOUT_MS = 35_000;

@Injectable({
  providedIn: 'root',
})
export class CaptainService {
  private environment = inject<any>('ENVIRONMENT' as any);
  private http = inject(HttpClient);

  /** Send the chat thread + portfolio summary, resolve to the Captain's reply. */
  public chat(
    messages: ChatMessage[],
    summary: CaptainSummary
  ): Observable<string> {
    const body = { mode: 'chat', messages, summary };
    return this.post(body);
  }

  /** Ask for the dashboard "Captain's read" narrative. */
  public insights(summary: CaptainSummary): Observable<string> {
    const body = { mode: 'insights', summary };
    return this.post(body);
  }

  private post(body: unknown): Observable<string> {
    return this.http
      .post<unknown>(this.environment.captainLambdaUrl, body)
      .pipe(
        timeout(CAPTAIN_TIMEOUT_MS),
        retryWithBackoff(),
        map((response) => parseCaptainReply(response))
      );
  }
}
