import { LEVEL_COLORS } from './chart-colors';

/** Datos de la medalla de un nivel (ver `LevelMedalComponent`). */
export interface LevelMedal {
  name: string;
  color: string;
  /** 0 (principiante) a 3 (avanzado): cada nivel suma un detalle a la medalla del anterior. */
  rank: number;
}

const LEVELS = ['principiante', 'básico', 'intermedio', 'avanzado'] as const;

/** Minúsculas y sin tildes, para comparar la categoría que manda el backend. */
function normalizeLevel(value: string): string {
  return value.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

/** La medalla de una categoría del backend; null si no es uno de los cuatro niveles. */
export function levelMedal(classification: string | null | undefined): LevelMedal | null {
  const current = normalizeLevel(classification ?? '');
  const index = LEVELS.findIndex((l) => normalizeLevel(l) === current);
  if (index < 0) return null;
  const level = LEVELS[index]!;
  return { name: level.charAt(0).toUpperCase() + level.slice(1), color: LEVEL_COLORS[level]!, rank: index };
}
