import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { ChartItem } from './chart-item';

interface Slice {
  key: string;
  label: string;
  count: number;
  pct: number;
  color: string;
  /** null cuando un solo tramo ocupa el 100%: se dibuja como círculo completo. */
  path: string | null;
}

const CENTER = 50;
const RADIUS = 48;

function point(angle: number): string {
  return `${(CENTER + RADIUS * Math.cos(angle)).toFixed(3)} ${(CENTER + RADIUS * Math.sin(angle)).toFixed(3)}`;
}

/**
 * Reparto de un total entre pocas categorías: una torta con su leyenda (valor y porcentaje de
 * cada una). Los tramos en 0 no se dibujan pero sí aparecen en la leyenda.
 */
@Component({
  selector: 'app-pie-chart',
  standalone: true,
  templateUrl: './pie-chart.component.html',
  styleUrl: './pie-chart.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PieChartComponent {
  readonly items = input.required<ChartItem[]>();
  /** Texto junto al total, por ejemplo "recursos activos". */
  readonly caption = input('');

  readonly total = computed(() => this.items().reduce((acc, i) => acc + i.count, 0));
  readonly summary = computed(() => this.items().map((i) => `${i.label}: ${i.count}`).join(', '));

  readonly slices = computed<Slice[]>(() => {
    const total = this.total();
    if (total === 0) return [];
    let start = -Math.PI / 2;
    return this.items()
      .filter((i) => i.count > 0)
      .map((i) => {
        const fraction = i.count / total;
        const end = start + fraction * 2 * Math.PI;
        const path =
          fraction >= 0.9999
            ? null
            : `M ${CENTER} ${CENTER} L ${point(start)} A ${RADIUS} ${RADIUS} 0 ${fraction > 0.5 ? 1 : 0} 1 ${point(end)} Z`;
        start = end;
        return { key: i.key, label: i.label, count: i.count, pct: Math.round(fraction * 100), color: i.color, path };
      });
  });

  percent(count: number): number {
    const total = this.total();
    return total === 0 ? 0 : Math.round((count / total) * 100);
  }
}
