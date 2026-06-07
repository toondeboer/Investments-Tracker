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

  it('posts a chat request and resolves to the reply + usage', (done) => {
    service.chat([{ role: 'user', content: 'How did I do?' }], summary).subscribe((res) => {
      expect(res.reply).toBe('Aye, all is well.');
      expect(res.usage?.plan).toBe('free');
      expect(res.usage?.remaining).toBe(29);
      done();
    });
    const req = httpMock.expectOne('/captain');
    expect(req.request.body.mode).toBe('chat');
    req.flush({
      reply: 'Aye, all is well.',
      usage: { plan: 'free', limit: 30, used: 1, remaining: 29 },
    });
  });

  it('tolerates a reply with no usage (usage = null)', (done) => {
    service.chat([{ role: 'user', content: 'hi' }], summary).subscribe((res) => {
      expect(res.reply).toBe('Aye.');
      expect(res.usage).toBeNull();
      done();
    });
    httpMock.expectOne('/captain').flush({ reply: 'Aye.' });
  });

  it('posts an insights request in insights mode', (done) => {
    service.insights(summary).subscribe((res) => {
      expect(res.reply).toBe('Calm seas.');
      done();
    });
    const req = httpMock.expectOne('/captain');
    expect(req.request.body.mode).toBe('insights');
    req.flush({ reply: 'Calm seas.' });
  });

  it('posts a status request and resolves to the snapshot', (done) => {
    service.status().subscribe((status) => {
      expect(status.plan).toBe('paid');
      expect(status.limit).toBe(1000);
      done();
    });
    const req = httpMock.expectOne('/captain');
    expect(req.request.body.mode).toBe('status');
    req.flush({ plan: 'paid', limit: 1000, used: 5, remaining: 995 });
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
