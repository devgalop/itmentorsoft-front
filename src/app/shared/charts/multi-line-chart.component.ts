import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

export interface SeriesPoint {
  /** Posición en el tiempo (por ejemplo, el índice de la evaluación: 0, 1, 2…). */
  x: number;
  /** Valor de 0 a 100. */
  value: number;
}

export interface LineSeries {
  key: string;
  label: string;
  color: string;
  points: SeriesPoint[];
}

const WIDTH = 360;
const HEIGHT = 210;
const PAD_LEFT = 40;
const PAD_RIGHT = 16;
const PAD_TOP = 14;
const PAD_BOTTOM = 40;
const GRID_VALUES = [0, 50, 100];
/** Largo de cada trazo cuando varias líneas coinciden y se alternan. */
const DASH = 5;
const DOT_RADIUS = 4.5;
/** Cuánto crece el radio de cada punto que comparte posición con otros (anillos concéntricos). */
const DOT_STEP = 2.5;

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

/**
 * Evolución de varias series (por ejemplo, un tema cada una) en el tiempo: una línea por serie
 * que une sus puntos según su posición `x`, con el 100 % arriba. Cada x se rotula como la
 * medición número x + 1 (la primera evaluación es 1). Incluye una leyenda y una tabla desplegable.
 */
@Component({
  selector: 'app-multi-line-chart',
  standalone: true,
  templateUrl: './multi-line-chart.component.html',
  styleUrl: './multi-line-chart.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MultiLineChartComponent {
  readonly series = input.required<LineSeries[]>();
  /** Título del eje horizontal. */
  readonly xTitle = input('Evaluación');

  readonly width = WIDTH;
  readonly height = HEIGHT;
  readonly left = PAD_LEFT;
  readonly right = WIDTH - PAD_RIGHT;

  private y(value: number): number {
    const clamped = Math.max(0, Math.min(100, value));
    const bottom = HEIGHT - PAD_BOTTOM;
    return round2(bottom - (clamped / 100) * (bottom - PAD_TOP));
  }

  readonly grid = GRID_VALUES.map((value) => ({ value, y: this.y(value) }));

  /** Posiciones x distintas de todas las series, de menor a mayor. */
  readonly xs = computed(() =>
    [...new Set(this.series().flatMap((s) => s.points.map((p) => p.x)))].sort((a, b) => a - b),
  );

  private xPos(x: number): number {
    const xs = this.xs();
    const min = xs[0] ?? 0;
    const max = xs[xs.length - 1] ?? 0;
    const span = WIDTH - PAD_RIGHT - PAD_LEFT;
    return max === min ? round2(PAD_LEFT + span / 2) : round2(PAD_LEFT + ((x - min) / (max - min)) * span);
  }

  readonly ticks = computed(() => this.xs().map((x) => ({ x, px: this.xPos(x), label: String(x + 1) })));

  readonly lines = computed(() =>
    this.series().map((s) => {
      const coords = [...s.points]
        .sort((a, b) => a.x - b.x)
        .map((p) => ({ x: p.x, value: p.value, px: this.xPos(p.x), py: this.y(p.value) }));
      return { key: s.key, label: s.label, color: s.color, coords, path: coords.map((c) => `${c.px},${c.py}`).join(' ') };
    }),
  );

  /**
   * Tramos de línea. Si dos o más series trazan exactamente el mismo tramo, ninguna debe tapar a
   * las otras: sus trazos se alternan (rayado intercalado) y cada color se ve por turnos.
   */
  readonly segments = computed(() => {
    const lines = this.lines();
    const keyOf = (a: { x: number; value: number }, b: { x: number; value: number }) =>
      `${a.x}|${a.value}|${b.x}|${b.value}`;
    const owners = new Map<string, number[]>();
    lines.forEach((l, i) => {
      for (let j = 1; j < l.coords.length; j++) {
        const key = keyOf(l.coords[j - 1]!, l.coords[j]!);
        owners.set(key, [...(owners.get(key) ?? []), i]);
      }
    });
    return lines.flatMap((l, i) =>
      l.coords.slice(1).map((c, k) => {
        const from = l.coords[k]!;
        const shared = owners.get(keyOf(from, c)) ?? [i];
        const rank = shared.indexOf(i);
        const count = shared.length;
        return {
          key: `${l.key}-${k}`,
          color: l.color,
          x1: from.px,
          y1: from.py,
          x2: c.px,
          y2: c.py,
          dash: count > 1 ? `${DASH} ${DASH * (count - 1)}` : null,
          dashOffset: count > 1 && rank > 0 ? -rank * DASH : 0,
        };
      }),
    );
  });

  /**
   * Puntos de todas las series. Los que caen en la misma posición se dibujan como anillos
   * concéntricos (el más grande primero), para que se vea el color de cada tema.
   */
  readonly markers = computed(() => {
    const lines = this.lines();
    const owners = new Map<string, number[]>();
    lines.forEach((l, i) =>
      l.coords.forEach((c) => {
        const key = `${c.x}|${c.value}`;
        owners.set(key, [...(owners.get(key) ?? []), i]);
      }),
    );
    return lines
      .flatMap((l, i) =>
        l.coords.map((c) => {
          const shared = owners.get(`${c.x}|${c.value}`) ?? [i];
          const rank = shared.indexOf(i);
          return {
            key: `${l.key}-${c.x}`,
            color: l.color,
            cx: c.px,
            cy: c.py,
            r: DOT_RADIUS + (shared.length - 1 - rank) * DOT_STEP,
            title: `${l.label} · ${this.xTitle()} ${c.x + 1}: ${c.value}%`,
          };
        }),
      )
      .sort((a, b) => b.r - a.r);
  });

  /** ¿Hay temas con resultados idénticos (líneas alternadas)? */
  readonly hasOverlap = computed(() => this.segments().some((s) => s.dash !== null) || this.markers().some((m) => m.r > DOT_RADIUS));

  /**
   * Datos en forma de tabla: una fila por serie, una columna por medición ("—" si falta) y el
   * cambio entre la primera y la última medición de esa serie (null si tiene una sola).
   */
  readonly rows = computed(() =>
    this.series().map((s) => {
      const sorted = [...s.points].sort((a, b) => a.x - b.x);
      const first = sorted[0];
      const last = sorted[sorted.length - 1];
      const change =
        sorted.length > 1 && first && last ? Math.round((last.value - first.value) * 10) / 10 : null;
      return {
        key: s.key,
        label: s.label,
        color: s.color,
        cells: this.xs().map((x) => s.points.find((p) => p.x === x)?.value ?? null),
        change,
      };
    }),
  );

  readonly summary = computed(() =>
    this.series()
      .map((s) => `${s.label}: ${[...s.points].sort((a, b) => a.x - b.x).map((p) => p.value + '%').join(', ')}`)
      .join('. '),
  );
}
