import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { ChartItem } from './chart-item';

/**
 * Pocas cantidades pequeñas (por ejemplo, usuarios por rol): una tarjeta por categoría con el
 * número grande y su porcentaje. Cuando son 3 o 4 cifras el número comunica más que un gráfico.
 */
@Component({
  selector: 'app-stat-cards',
  standalone: true,
  templateUrl: './stat-cards.component.html',
  styleUrl: './stat-cards.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StatCardsComponent {
  readonly items = input.required<ChartItem[]>();
  /** Texto junto al total, por ejemplo "usuarios en total". */
  readonly caption = input('');

  readonly total = computed(() => this.items().reduce((acc, i) => acc + i.count, 0));

  percent(count: number): number {
    const total = this.total();
    return total === 0 ? 0 : Math.round((count / total) * 100);
  }
}
