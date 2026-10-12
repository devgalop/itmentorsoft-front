import { CATEGORY_PALETTE, FALLBACK_COLOR } from './chart-colors';
import { ChartItem } from './chart-item';

/**
 * Asigna la paleta categórica por posición (la lista ya viene ordenada) y, si hay más
 * categorías que colores, agrupa las últimas en "Otros".
 */
export function toCategoryItems(
  rows: { key: string; label: string; count: number }[],
  max = CATEGORY_PALETTE.length,
): ChartItem[] {
  if (rows.length <= max) {
    return rows.map((r, i) => ({ ...r, color: CATEGORY_PALETTE[i] ?? FALLBACK_COLOR }));
  }
  const head = rows.slice(0, max - 1).map((r, i) => ({ ...r, color: CATEGORY_PALETTE[i] ?? FALLBACK_COLOR }));
  const rest = rows.slice(max - 1);
  return [
    ...head,
    {
      key: '__otros',
      label: `Otros (${rest.length})`,
      count: rest.reduce((acc, r) => acc + r.count, 0),
      color: FALLBACK_COLOR,
    },
  ];
}
