import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { BillingService } from './billing.service';

describe('BillingService', () => {
  let service: BillingService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        BillingService,
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: 'ENVIRONMENT', useValue: { billingLambdaUrl: '/billing' } },
      ],
    });
    service = TestBed.inject(BillingService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('posts to /billing/checkout and resolves to the Stripe URL', (done) => {
    service.createCheckout().subscribe((url) => {
      expect(url).toBe('https://checkout.stripe.com/abc');
      done();
    });
    const req = httpMock.expectOne('/billing/checkout');
    expect(req.request.method).toBe('POST');
    req.flush({ url: 'https://checkout.stripe.com/abc' });
  });

  it('rejects a malformed checkout response (zod)', (done) => {
    service.createCheckout().subscribe({
      next: () => done.fail('should not succeed'),
      error: (err) => {
        expect(err).toBeDefined();
        done();
      },
    });
    httpMock.expectOne('/billing/checkout').flush({ notUrl: true });
  });

  it('startUpgrade triggers the checkout request', () => {
    service.startUpgrade();
    const req = httpMock.expectOne('/billing/checkout');
    expect(req.request.method).toBe('POST');
    // The redirect side-effect (window.location.href = url) is environment-
    // driven and not asserted here; the checkout request firing is the unit.
    req.flush({ url: 'https://checkout.stripe.com/go' });
  });
});
