import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { CaptainService } from './captain.service';
import { CaptainSummary } from './captain.types';

const summary = { currency: 'EUR', holdings: [], notableMovers: [] } as unknown as CaptainSummary;

describe('CaptainService', () => {
  let service: CaptainService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        CaptainService,
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: 'ENVIRONMENT', useValue: { captainLambdaUrl: '/captain' } },
      ],
    });
    service = TestBed.inject(CaptainService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('posts a chat request and resolves to the reply', (done) => {
    service.chat([{ role: 'user', content: 'How did I do?' }], summary).subscribe((reply) => {
      expect(reply).toBe('Aye, all is well.');
      done();
    });
    const req = httpMock.expectOne('/captain');
    expect(req.request.body.mode).toBe('chat');
    req.flush({ reply: 'Aye, all is well.' });
  });

  it('posts an insights request in insights mode', (done) => {
    service.insights(summary).subscribe((reply) => {
      expect(reply).toBe('Calm seas.');
      done();
    });
    const req = httpMock.expectOne('/captain');
    expect(req.request.body.mode).toBe('insights');
    req.flush({ reply: 'Calm seas.' });
  });

  it('rejects a malformed payload (zod)', (done) => {
    service.insights(summary).subscribe({
      next: () => done.fail('should not succeed'),
      error: (err) => {
        expect(err).toBeDefined();
        done();
      },
    });
    httpMock.expectOne('/captain').flush({ notReply: true });
  });
});
