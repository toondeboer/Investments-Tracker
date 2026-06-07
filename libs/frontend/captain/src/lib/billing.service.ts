import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { z } from 'zod';

// The billing Lambda returns a Stripe Checkout Session URL to redirect to.
const checkoutSchema = z.object({ url: z.string().url() });

/**
 * Talks to the billing Lambda to start a Stripe Checkout (subscription) flow.
 * The JwtInterceptor attaches the Cognito ID token, so the Lambda knows which
 * user to upgrade. The Stripe webhook — not the client — is the source of truth
 * for the resulting plan.
 */
@Injectable({ providedIn: 'root' })
export class BillingService {
  private environment = inject<any>('ENVIRONMENT' as any);
  private http = inject(HttpClient);

  /** Resolve to the Stripe Checkout URL the caller should redirect to. */
  public createCheckout(): Observable<string> {
    return this.http
      .post<unknown>(`${this.environment.billingLambdaUrl}/checkout`, {})
      .pipe(map((res) => checkoutSchema.parse(res).url));
  }

  /** Start checkout and redirect the browser to Stripe. */
  public startUpgrade(): void {
    this.createCheckout().subscribe({
      next: (url) => {
        window.location.href = url;
      },
      // Surfaced by the caller's own error handling if needed; swallow here so
      // a failed redirect doesn't throw in the click handler.
      error: () => undefined,
    });
  }
}
