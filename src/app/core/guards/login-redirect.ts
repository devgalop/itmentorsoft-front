import { Router, UrlTree } from '@angular/router';
import { safeReturnUrl } from '@core/auth/return-url';

/**
 * Redirige al login recordando a dónde iba la persona (`returnUrl`), para volver ahí después de
 * iniciar sesión. La raíz no se recuerda: ya es el destino por defecto.
 */
export function loginRedirect(router: Router, attemptedUrl: string | undefined): UrlTree {
  const returnUrl = safeReturnUrl(attemptedUrl);
  if (!returnUrl || returnUrl === '/') return router.parseUrl('/login');
  return router.createUrlTree(['/login'], { queryParams: { returnUrl } });
}
