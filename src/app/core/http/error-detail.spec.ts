import { HttpErrorResponse } from '@angular/common/http';
import { errorDetail, errorDetailText } from './error-detail';

const failure = (body: unknown) => new HttpErrorResponse({ error: body, status: 500 });

describe('errorDetail', () => {
  it('reads `detail` (FastAPI format)', () => {
    expect(errorDetail(failure({ detail: 'algo' }))).toBe('algo');
  });

  it('reads `message` when the backend answers { status, message, path }', () => {
    expect(errorDetail(failure({ status: 500, message: 'algo', path: '/x' }))).toBe('algo');
  });

  it('prefers `detail` when both are present', () => {
    expect(errorDetail(failure({ detail: 'uno', message: 'dos' }))).toBe('uno');
  });

  it('keeps objects and lists as they come', () => {
    expect(errorDetail(failure({ message: { is_temporarily_blocked: true } }))).toEqual({ is_temporarily_blocked: true });
    expect(errorDetail(failure({ detail: [{ msg: 'x' }] }))).toEqual([{ msg: 'x' }]);
  });

  it('returns undefined for bodies without detail or message', () => {
    expect(errorDetail(failure(null))).toBeUndefined();
    expect(errorDetail(failure('texto'))).toBeUndefined();
    expect(errorDetail(failure({}))).toBeUndefined();
  });
});

describe('errorDetailText', () => {
  it('returns the text, or an empty string when the detail is not a text', () => {
    expect(errorDetailText(failure({ message: 'hola' }))).toBe('hola');
    expect(errorDetailText(failure({ message: { a: 1 } }))).toBe('');
    expect(errorDetailText(failure(null))).toBe('');
  });
});
