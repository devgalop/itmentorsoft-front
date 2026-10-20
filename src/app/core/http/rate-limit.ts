import { HttpErrorResponse } from '@angular/common/http';

/**
 * Mensaje para un 429 (demasiadas solicitudes). Si el backend indica cuánto esperar
 * (cabecera `Retry-After`, en segundos), se le dice al usuario; si no, un aviso general.
 */
export function rateLimitMessage(error: HttpErrorResponse): string {
  const seconds = Number(error.headers?.get('Retry-After'));
  if (!Number.isFinite(seconds) || seconds <= 0) {
    return 'Hiciste muchas solicitudes seguidas. Espera un momento e intenta de nuevo.';
  }
  if (seconds < 60) {
    const n = Math.ceil(seconds);
    return `Hiciste muchas solicitudes seguidas. Espera ${n} ${n === 1 ? 'segundo' : 'segundos'} e intenta de nuevo.`;
  }
  const minutes = Math.ceil(seconds / 60);
  return `Hiciste muchas solicitudes seguidas. Espera ${minutes} ${minutes === 1 ? 'minuto' : 'minutos'} e intenta de nuevo.`;
}
