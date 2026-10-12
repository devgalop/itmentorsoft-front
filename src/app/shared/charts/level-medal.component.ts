import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/**
 * Medalla del nivel actual del estudiante, estilo videojuego: cada nivel suma un detalle a la
 * del anterior (disco, cinta, estrella, y corona con alas y destellos).
 */
@Component({
  selector: 'app-level-medal',
  standalone: true,
  templateUrl: './level-medal.component.html',
  styleUrl: './level-medal.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LevelMedalComponent {
  readonly name = input.required<string>();
  readonly color = input.required<string>();
  /** 0 (principiante) a 3 (avanzado). */
  readonly rank = input.required<number>();
  /** Texto bajo el nombre (por defecto el nivel actual del estudiante). */
  readonly caption = input('Tu nivel actual');
}
