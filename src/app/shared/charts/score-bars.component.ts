import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { scoreColor } from './chart-colors';

export interface ScoreItem {
  key: string;
  label: string;
  /** Puntaje de 0 a 100; el 100 es el mejor. */
  value: number;
  /**
   * Color propio del tema (el mismo de su línea en otras gráficas). La barra va de un tono muy
   * claro con 0 % al color original con 100 %. Sin color, se usa la rampa por puntaje.
   */
  color?: string;
}

/** Con 0 % la barra conserva este porcentaje del color (para que no desaparezca sobre el fondo). */
const MIN_TINT = 22;

/**
 * Perfil por categorías: una barra por tema sobre una escala fija de 0 a 100 %, ordenada del
 * mejor al peor, con el color más oscuro mientras más alto el puntaje. Rotula la mayor
 * fortaleza y el tema a reforzar cuando hay al menos dos con distinto puntaje.
 */
@Component({
  selector: 'app-score-bars',
  standalone: true,
  templateUrl: './score-bars.component.html',
  styleUrl: './score-bars.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ScoreBarsComponent {
  readonly items = input.required<ScoreItem[]>();

  /** Del mayor al menor puntaje; a igual puntaje se conserva el orden recibido. */
  readonly sorted = computed(() => [...this.items()].sort((a, b) => b.value - a.value));

  private readonly spread = computed(() => {
    const s = this.sorted();
    return s.length >= 2 && s[0]!.value !== s[s.length - 1]!.value;
  });

  readonly bestKey = computed(() => (this.spread() ? this.sorted()[0]!.key : null));
  readonly worstKey = computed(() => (this.spread() ? this.sorted()[this.sorted().length - 1]!.key : null));

  /** Relleno de la barra: el color del tema, más claro mientras más bajo el puntaje. */
  fill(item: ScoreItem): string {
    if (!item.color) return scoreColor(item.value);
    const share = Math.round((MIN_TINT + ((100 - MIN_TINT) * this.pct(item.value)) / 100) * 10) / 10;
    return `color-mix(in srgb, ${item.color} ${share}%, #ffffff)`;
  }

  /** Degradado de la barra: parte de un tono claro y termina en el color según el puntaje. */
  gradient(item: ScoreItem): string {
    if (!item.color) return scoreColor(item.value);
    const start = `color-mix(in srgb, ${item.color} ${MIN_TINT}%, #ffffff)`;
    return `linear-gradient(90deg, ${start}, ${this.fill(item)})`;
  }

  /** Puntaje entero entre 0 y 100. */
  pct(value: number): number {
    return Math.max(0, Math.min(100, Math.round(value)));
  }
}
