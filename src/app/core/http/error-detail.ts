import { HttpErrorResponse } from '@angular/common/http';

/**
 * Detalle de un error de la API. FastAPI responde `{ detail }`, pero desde que el backend maneja
 * las excepciones por su cuenta los errores llegan como `{ status, message, path }`, donde
 * `message` lleva lo que antes iba en `detail` (un texto, un objeto o la lista de validación).
 * Se aceptan los dos formatos para no depender de cuál versión del backend esté desplegada.
 */
export function errorDetail(error: HttpErrorResponse): unknown {
  const body = error.error as { detail?: unknown; message?: unknown } | null | undefined;
  return body?.detail ?? body?.message;
}

/** El detalle como texto, o una cadena vacía si no es un texto. */
export function errorDetailText(error: HttpErrorResponse): string {
  const detail = errorDetail(error);
  return typeof detail === 'string' ? detail : '';
}
