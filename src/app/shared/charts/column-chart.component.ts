import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { ChartItem } from './chart-item';

/** Alto en píxeles de la columna más alta. */
const MAX_BAR_PX = 120;

/**
 * Cantidades por categoría ordenada (por ejemplo, estudiantes por nivel): columnas verticales en
 * el orden recibido, con el conteo sobre cada una. Una categoría en 0 se ve como una columna
 * vacía, para que se note que existe y no hay nadie.
 */
@Component({
  selector: 'app-column-chart',
  standalone: true,
  templateUrl: './column-chart.component.html',
  styleUrl: './column-chart.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ColumnChartComponent {
  readonly items = input.required<ChartItem[]>();
  /** Texto junto al total, por ejemplo "estudiantes clasificados". */
  readonly caption = input('');

  readonly total = computed(() => this.items().reduce((acc, i) => acc + i.count, 0));
  readonly max = computed(() => Math.max(0, ...this.items().map((i) => i.count)));
  readonly summary = computed(() => this.items().map((i) => `${i.label}: ${i.count}`).join(', '));

  percent(count: number): number {
    const total = this.total();
    return total === 0 ? 0 : Math.round((count / total) * 100);
  }

  /** Alto de la columna en píxeles, proporcional a la más alta. */
  barPx(count: number): number {
    const max = this.max();
    return max === 0 ? 0 : Math.round((count / max) * MAX_BAR_PX);
  }
}
