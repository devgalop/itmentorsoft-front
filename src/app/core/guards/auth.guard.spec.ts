import { TestBed } from '@angular/core/testing';
import { Router, UrlTree } from '@angular/router';
import { vi } from 'vitest';
import { authGuard } from './auth.guard';
import { AuthService } from '../auth/auth.service';

describe('authGuard', () => {
  let authServiceMock: { isAuthenticated: ReturnType<typeof vi.fn> };
  let routerMock: { parseUrl: ReturnType<typeof vi.fn>; createUrlTree: ReturnType<typeof vi.fn> };
  const plainTree = { kind: 'plain' } as unknown as UrlTree;
  const returnTree = { kind: 'return' } as unknown as UrlTree;

  beforeEach(() => {
    authServiceMock = { isAuthenticated: vi.fn() };
    routerMock = {
      parseUrl: vi.fn().mockReturnValue(plainTree),
      createUrlTree: vi.fn().mockReturnValue(returnTree),
    };
    TestBed.configureTestingModule({
      providers: [
        { provide: AuthService, useValue: authServiceMock },
        { provide: Router, useValue: routerMock },
      ],
    });
  });

  const run = (url: string | undefined) =>
    TestBed.runInInjectionContext(() => authGuard({} as never, { url } as never));

  it('lets an authenticated user through', () => {
    authServiceMock.isAuthenticated.mockReturnValue(true);
    expect(run('/student/assessments')).toBe(true);
  });

  it('sends a visitor to /login remembering the address they were going to', () => {
    authServiceMock.isAuthenticated.mockReturnValue(false);

    expect(run('/student/assessments?result=abc')).toBe(returnTree);
    expect(routerMock.createUrlTree).toHaveBeenCalledWith(['/login'], {
      queryParams: { returnUrl: '/student/assessments?result=abc' },
    });
  });

  it('does not remember the root: it is already the default destination', () => {
    authServiceMock.isAuthenticated.mockReturnValue(false);

    expect(run('/')).toBe(plainTree);
    expect(routerMock.parseUrl).toHaveBeenCalledWith('/login');
    expect(routerMock.createUrlTree).not.toHaveBeenCalled();
  });
});
