import { returnUrlForRole, safeReturnUrl } from './return-url';

describe('safeReturnUrl', () => {
  it('accepts internal routes, with query string and fragment', () => {
    expect(safeReturnUrl('/student/assessments')).toBe('/student/assessments');
    expect(safeReturnUrl('/student/assessments?result=abc#top')).toBe('/student/assessments?result=abc#top');
  });

  it('rejects empty values and anything that is not an internal route', () => {
    expect(safeReturnUrl(null)).toBeNull();
    expect(safeReturnUrl(undefined)).toBeNull();
    expect(safeReturnUrl('')).toBeNull();
    expect(safeReturnUrl('student')).toBeNull();
    expect(safeReturnUrl('https://evil.example.com')).toBeNull();
    expect(safeReturnUrl('//evil.example.com')).toBeNull();
    expect(safeReturnUrl('/\\evil.example.com')).toBeNull();
    expect(safeReturnUrl('/student\n/x')).toBeNull();
  });

  it('never returns to an access screen', () => {
    for (const path of ['/login', '/otp', '/register', '/recover-password', '/reset-password']) {
      expect(safeReturnUrl(path)).toBeNull();
      expect(safeReturnUrl(`${path}?token=x`)).toBeNull();
    }
  });
});

describe('returnUrlForRole', () => {
  it('keeps an address inside the role module', () => {
    expect(returnUrlForRole('/student/assessments?result=a', '/student')).toBe('/student/assessments?result=a');
    expect(returnUrlForRole('/student', '/student')).toBe('/student');
    expect(returnUrlForRole('/student?x=1', '/student')).toBe('/student?x=1');
  });

  it('drops addresses from another role module or a similar-looking prefix', () => {
    expect(returnUrlForRole('/admin/users', '/student')).toBeNull();
    expect(returnUrlForRole('/students/x', '/student')).toBeNull();
  });

  it('drops addresses that are not safe', () => {
    expect(returnUrlForRole('//evil.example.com', '/student')).toBeNull();
    expect(returnUrlForRole(null, '/student')).toBeNull();
  });
});
