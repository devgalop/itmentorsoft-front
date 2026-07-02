import { JwtService } from './jwt.service';

function base64UrlEncode(obj: object): string {
  const json = JSON.stringify(obj);
  const base64 = btoa(json);
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function buildFakeJwt(payload: object): string {
  const header = base64UrlEncode({ alg: 'HS256', typ: 'JWT' });
  const body = base64UrlEncode(payload);
  const fakeSignature = 'fake-signature';
  return `${header}.${body}.${fakeSignature}`;
}

describe('JwtService', () => {
  let service: JwtService;

  const nowInSeconds = () => Math.floor(Date.now() / 1000);

  const VALID_STUDENT_TOKEN = buildFakeJwt({
    user_name: 'eider_test',
    role: 'student',
    exp: nowInSeconds() + 3600,
  });

  const EXPIRED_TEACHER_TOKEN = buildFakeJwt({
    user_name: 'eider_test',
    role: 'teacher',
    exp: nowInSeconds() - 3600,
  });

  const ADMIN_TOKEN = buildFakeJwt({
    user_name: 'admin_test',
    role: 'admin',
    exp: nowInSeconds() + 3600,
  });

  const MALFORMED_TOKEN = 'not-a-real-jwt';

  beforeEach(() => {
    service = new JwtService();
  });

  describe('decode', () => {
    it('returns userName and role from a valid student token', () => {
      const result = service.decode(VALID_STUDENT_TOKEN);
      expect(result).toEqual({ userName: 'eider_test', role: 'student' });
    });

    it('returns userName and role from a valid admin token', () => {
      const result = service.decode(ADMIN_TOKEN);
      expect(result).toEqual({ userName: 'admin_test', role: 'admin' });
    });

    it('returns null for a malformed token instead of throwing', () => {
      expect(service.decode(MALFORMED_TOKEN)).toBeNull();
    });
  });

  describe('isExpired', () => {
    it('returns false for a token with future exp', () => {
      expect(service.isExpired(VALID_STUDENT_TOKEN)).toBe(false);
    });

    it('returns true for a token with past exp', () => {
      expect(service.isExpired(EXPIRED_TEACHER_TOKEN)).toBe(true);
    });

    it('returns true for a malformed token instead of throwing', () => {
      expect(service.isExpired(MALFORMED_TOKEN)).toBe(true);
    });
  });
});