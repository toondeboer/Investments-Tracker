import { MonoTypeOperatorFunction, retry, timer } from 'rxjs';

// Per-request timeouts (ms). DynamoDB is fast; the Yahoo Lambda fans out to the
// Yahoo API and is slower (its own Lambda timeout is 30s), so allow a bit more.
export const DYNAMODB_TIMEOUT_MS = 15_000;
export const YAHOO_TIMEOUT_MS = 35_000;

// Retry transient failures only: network errors / RxJS TimeoutError (no status),
// request timeout, rate limiting, and 5xx. Client errors (400/401/403/404/...)
// won't succeed on retry, so they're rethrown immediately.
function isRetryable(error: unknown): boolean {
  const status = (error as { status?: number })?.status;
  if (status === undefined || status === 0) {
    return true;
  }
  return status === 408 || status === 429 || status >= 500;
}

/**
 * Retry a read-idempotent HTTP stream on transient failures with exponential
 * backoff + jitter. Non-retryable errors are rethrown without retrying.
 *
 * Pipe this AFTER `timeout(...)` and BEFORE any validation/parse `map(...)` so
 * timeouts are retried but a bad payload fails fast.
 */
export function retryWithBackoff<T>(
  maxRetries = 2,
  baseDelayMs = 500,
): MonoTypeOperatorFunction<T> {
  return retry({
    count: maxRetries,
    delay: (error, retryCount) => {
      if (!isRetryable(error)) {
        throw error;
      }
      const backoff = baseDelayMs * 2 ** (retryCount - 1);
      return timer(backoff + Math.random() * 100);
    },
  });
}
