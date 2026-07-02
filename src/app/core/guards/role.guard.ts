import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '@core/auth/auth.service';
import { UserRole } from '@core/auth/auth.types';

export function roleGuard(allowedRole: UserRole): CanActivateFn {
  return () => {
    const auth = inject(AuthService);
    const router = inject(Router);

    if (!auth.isAuthenticated()) {
      return router.parseUrl('/login');
    }

    if (auth.role() !== allowedRole) {
      return router.parseUrl('/login');
    }

    return true;
  };
}