import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, from, switchMap, throwError } from 'rxjs';
import { AuthService } from '../auth/auth.service';

const REFRESH_URL = '/users/sessions/refresh';
const LOGIN_URL = '/users/sessions';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const token = sessionStorage.getItem('auth_token');

  // No tocar el login ni el refresh (evita bucles).
  const isAuthCall = req.url.includes(REFRESH_URL) || req.url.endsWith(LOGIN_URL);

  const authedReq =
    token && !isAuthCall ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } }) : req;

  return next(authedReq).pipe(
    catchError((error: unknown) => {
      const is401 = error instanceof HttpErrorResponse && error.status === 401;

      // Si no es 401, o es una llamada de auth, propagar el error tal cual.
      if (!is401 || isAuthCall) {
        return throwError(() => error);
      }

      // 401 en una petición normal: intentar refrescar una vez y reintentar.
      return from(auth.refreshSession()).pipe(
        switchMap((newToken) => {
          if (newToken) {
            return next(req.clone({ setHeaders: { Authorization: `Bearer ${newToken}` } }));
          }
          // No se pudo refrescar: expirar sesión y redirigir al login con aviso.
          auth.expireSession();
          return throwError(() => error);
        }),
      );
    }),
  );
};
