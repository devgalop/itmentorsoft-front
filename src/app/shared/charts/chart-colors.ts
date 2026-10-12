/**
 * Colores de las gráficas. Los de roles (categorías sin orden) pasaron la validación de
 * paleta categórica (separación para daltonismo, banda de luminosidad y croma); los de
 * nivel son una rampa de un solo tono, de claro (principiante) a oscuro (avanzado).
 * Cada color sigue a la entidad, no a su posición: un rol conserva su color siempre.
 */
export const ROLE_COLORS: Record<string, string> = {
  admin: '#3B6FD4',
  teacher: '#1ABCB0',
  student: '#D97706',
  user: '#8B5CF6',
};

export const LEVEL_COLORS: Record<string, string> = {
  principiante: '#9BE3DD',
  básico: '#4FCFC6',
  intermedio: '#1ABCB0',
  avanzado: '#0E7F78',
};

/** Para un valor desconocido: un gris neutro que no se confunde con ninguna categoría. */
export const FALLBACK_COLOR = '#7C8AA5';

export function roleColor(role: string): string {
  return ROLE_COLORS[role.toLowerCase()] ?? FALLBACK_COLOR;
}

export function levelColor(level: string): string {
  return LEVEL_COLORS[level.toLowerCase()] ?? FALLBACK_COLOR;
}
