import { HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { rateLimitMessage } from './rate-limit';

const tooMany = (retryAfter?: string) =>
  new HttpErrorResponse({
    status: 429,
    headers: retryAfter === undefined ? new HttpHeaders() : new HttpHeaders({ 'Retry-After': retryAfter }),
  });

describe('rateLimitMessage', () => {
  it('uses a general message when the backend does not say how long to wait', () => {
    expect(rateLimitMessage(tooMany())).toBe(
      'Hiciste muchas solicitudes seguidas. Espera un momento e intenta de nuevo.',
    );
  });

  it('ignores an invalid or empty wait time', () => {
    expect(rateLimitMessage(tooMany('abc'))).toContain('Espera un momento');
    expect(rateLimitMessage(tooMany('0'))).toContain('Espera un momento');
    expect(rateLimitMessage(tooMany('-5'))).toContain('Espera un momento');
  });

  it('tells the wait in seconds when it is under a minute', () => {
    expect(rateLimitMessage(tooMany('30'))).toContain('Espera 30 segundos');
    expect(rateLimitMessage(tooMany('1'))).toContain('Espera 1 segundo e');
  });

  it('rounds up to whole minutes from a minute on', () => {
    expect(rateLimitMessage(tooMany('60'))).toContain('Espera 1 minuto e');
    expect(rateLimitMessage(tooMany('61'))).toContain('Espera 2 minutos');
    expect(rateLimitMessage(tooMany('900'))).toContain('Espera 15 minutos');
  });

  it('does not fail when the response has no headers', () => {
    expect(rateLimitMessage({ status: 429 } as HttpErrorResponse)).toContain('Espera un momento');
  });
});
