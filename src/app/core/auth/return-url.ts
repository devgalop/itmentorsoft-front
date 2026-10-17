/** Pantallas de acceso: nunca son un destino al que volver después de iniciar sesión. */
const ACCESS_PATHS = ['/login', '/otp', '/register', '/recover-password', '/reset-password'];

/**
 * Valida una dirección a la que volver después de iniciar sesión: solo rutas internas del sitio
 * (empiezan con una sola "/"), sin caracteres de control y que no sean pantallas de acceso.
 */
export function safeReturnUrl(url: string | null | undefined): string | null {
  if (!url || !url.startsWith('/') || url.startsWith('//') || url.startsWith('/\\')) return null;
  if (/[\u0000-\u001f]/.test(url)) return null;
  const path = url.split(/[?#]/)[0]!;
  return ACCESS_PATHS.includes(path) ? null : url;
}

/**
 * Destino después del login: la dirección guardada si es válida y pertenece al módulo del rol
 * (para no mandar a un docente a una pantalla de estudiante), o `null` si no hay que usarla.
 */
export function returnUrlForRole(url: string | null | undefined, home: string): string | null {
  const safe = safeReturnUrl(url);
  if (!safe) return null;
  const path = safe.split(/[?#]/)[0]!;
  return path === home || path.startsWith(home + '/') ? safe : null;
}
