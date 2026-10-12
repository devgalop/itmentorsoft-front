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
