import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '@core/auth/auth.service';
import { UserRole } from '@core/auth/auth.types';
import { loginRedirect } from './login-redirect';

export function roleGuard(allowedRole: UserRole): CanActivateFn {
  return (_route, state) => {
    const auth = inject(AuthService);
    const router = inject(Router);

    if (!auth.isAuthenticated()) {
      return loginRedirect(router, state?.url);
    }

    if (auth.role() !== allowedRole) {
      return router.parseUrl('/login');
    }

    return true;
  };
}