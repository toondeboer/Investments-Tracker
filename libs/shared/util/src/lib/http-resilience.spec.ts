import { defer, lastValueFrom, of, throwError } from 'rxjs';
import { retryWithBackoff } from './http-resilience';

describe('retryWithBackoff', () => {
  it('retries a transient (5xx) failure, then succeeds', async () => {
    let attempts = 0;
    const source = defer(() => {
      attempts++;
      return attempts < 3 ? throwError(() => ({ status: 503 })) : of('ok');
    });

    const result = await lastValueFrom(source.pipe(retryWithBackoff(3, 1)));
    expect(result).toBe('ok');
    expect(attempts).toBe(3);
  });

  it('retries network/timeout errors (no status)', async () => {
    let attempts = 0;
    const source = defer(() => {
      attempts++;
      return attempts < 2 ? throwError(() => new Error('timeout')) : of('ok');
    });

    const result = await lastValueFrom(source.pipe(retryWithBackoff(2, 1)));
    expect(result).toBe('ok');
    expect(attempts).toBe(2);
  });

  it('does NOT retry client errors (e.g. 401)', async () => {
    let attempts = 0;
    const source = defer(() => {
      attempts++;
      return throwError(() => ({ status: 401 }));
    });

    await expect(
      lastValueFrom(source.pipe(retryWithBackoff(3, 1))),
    ).rejects.toEqual({ status: 401 });
    expect(attempts).toBe(1);
  });

  it('gives up after the retry budget is exhausted', async () => {
    let attempts = 0;
    const source = defer(() => {
      attempts++;
      return throwError(() => ({ status: 500 }));
    });

    await expect(
      lastValueFrom(source.pipe(retryWithBackoff(2, 1))),
    ).rejects.toEqual({ status: 500 });
    expect(attempts).toBe(3); // initial + 2 retries
  });
});
