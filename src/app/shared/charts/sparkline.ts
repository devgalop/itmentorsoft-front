/** Mini gráfica de línea: puntos de un `<polyline>` y la posición del último punto. */
export interface Sparkline {
  points: string;
  last: { x: number; y: number };
}

/**
 * Convierte valores de 0 a 100 (del más antiguo al más reciente) en los puntos de una línea que
 * cabe en `width` × `height`. Con menos de dos valores no hay línea que dibujar (null).
 */
export function buildSparkline(values: number[], width: number, height: number, pad = 4): Sparkline | null {
  if (values.length < 2) return null;
  const coords = values.map((value, i) => ({
    x: pad + (i * (width - 2 * pad)) / (values.length - 1),
    y: height - pad - (Math.max(0, Math.min(100, value)) / 100) * (height - 2 * pad),
  }));
  return {
    points: coords.map((c) => `${c.x.toFixed(1)},${c.y.toFixed(1)}`).join(' '),
    last: coords[coords.length - 1]!,
  };
}
