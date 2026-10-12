import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';

/**
 * Botones "Anterior" y "Siguiente" con el número de página. No se muestra si hay una sola
 * página. `page` empieza en 0; quien lo usa decide qué cargar al recibir `prev` o `next`.
 */
@Component({
  selector: 'app-pager',
  standalone: true,
  templateUrl: './pager.component.html',
  styleUrl: './pager.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PagerComponent {
  readonly page = input.required<number>();
  readonly totalPages = input.required<number>();
  readonly prev = output<void>();
  readonly next = output<void>();

  readonly canPrev = computed(() => this.page() > 0);
  readonly canNext = computed(() => this.page() + 1 < this.totalPages());
}
