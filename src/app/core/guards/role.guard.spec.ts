import { TestBed } from '@angular/core/testing';
import { Router, UrlTree } from '@angular/router';
import { vi } from 'vitest';
import { roleGuard } from './role.guard';
import { AuthService } from '../auth/auth.service';

describe('roleGuard', () => {
  let authServiceMock: { isAuthenticated: ReturnType<typeof vi.fn>; role: ReturnType<typeof vi.fn> };
  let routerMock: { parseUrl: ReturnType<typeof vi.fn> };
  const fakeUrlTree = {} as UrlTree;

  beforeEach(() => {
    authServiceMock = {
      isAuthenticated: vi.fn(),
      role: vi.fn(),
    };
    routerMock = { parseUrl: vi.fn().mockReturnValue(fakeUrlTree) };

    TestBed.configureTestingModule({
      providers: [
        { provide: AuthService, useValue: authServiceMock },
        { provide: Router, useValue: routerMock },
      ],
    });
  });

  function runGuard(allowedRole: 'student' | 'teacher' | 'admin') {
    return TestBed.runInInjectionContext(() => roleGuard(allowedRole)({} as never, {} as never));
  }

  it('redirects to /login when user is not authenticated', () => {
    authServiceMock.isAuthenticated.mockReturnValue(false);

    const result = runGuard('student');

    expect(result).toBe(fakeUrlTree);
    expect(routerMock.parseUrl).toHaveBeenCalledWith('/login');
  });

  it('redirects to /login when role does not match allowed role', () => {
    authServiceMock.isAuthenticated.mockReturnValue(true);
    authServiceMock.role.mockReturnValue('teacher');

    const result = runGuard('student');

    expect(result).toBe(fakeUrlTree);
    expect(routerMock.parseUrl).toHaveBeenCalledWith('/login');
  });

  it('allows access when role matches allowed role', () => {
    authServiceMock.isAuthenticated.mockReturnValue(true);
    authServiceMock.role.mockReturnValue('admin');

    const result = runGuard('admin');

    expect(result).toBe(true);
  });

  it('allows access for student role on student guard', () => {
    authServiceMock.isAuthenticated.mockReturnValue(true);
    authServiceMock.role.mockReturnValue('student');

    const result = runGuard('student');

    expect(result).toBe(true);
  });
});