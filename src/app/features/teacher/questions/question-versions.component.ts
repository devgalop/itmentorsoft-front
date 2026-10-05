import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
  untracked,
} from '@angular/core';
import { AssessmentsService } from '@core/assessments/assessments.service';
import { QuestionListItem } from '@core/assessments/assessments.types';

/**
 * Historial de versiones de una pregunta, desplegable dentro del detalle. Al elegir una versión
 * avisa al padre (`select`) para que abra su detalle; el listado se mantiene mientras el id
 * elegido pertenezca a la misma cadena de versiones.
 */
@Component({
  selector: 'app-question-versions',
  standalone: true,
  templateUrl: './question-versions.component.html',
  styleUrl: './question-versions.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class QuestionVersionsComponent {
  private readonly assessments = inject(AssessmentsService);

  /** Id de la pregunta que se está viendo (cualquier versión de la cadena sirve). */
  readonly questionId = input.required<string>();
  readonly select = output<string>();

  readonly isOpen = signal(false);
  readonly versions = signal<QuestionListItem[]>([]);
  readonly isLoading = signal(false);
  readonly error = signal<string | null>(null);

  /** Número de la versión más nueva, para marcarla como "Última". */
  readonly latest = computed(() => Math.max(0, ...this.versions().map((v) => v.version)));

  constructor() {
    effect(() => {
      const id = this.questionId();
      untracked(() => {
        // Si el nuevo id ya está en la lista (cambió de versión), no hace falta recargar.
        if (this.versions().some((v) => v.question_id === id)) return;
        this.versions.set([]);
        this.error.set(null);
        if (this.isOpen()) void this.load(id);
      });
    });
  }

  toggle(): void {
    const open = !this.isOpen();
    this.isOpen.set(open);
    if (open && this.versions().length === 0 && !this.isLoading()) {
      void this.load(this.questionId());
    }
  }

  statusLabel(value: string | null): string {
    const map: Record<string, string> = {
      draft: 'Borrador',
      published: 'Publicada',
      archived: 'Archivada',
    };
    return value ? (map[value.toLowerCase()] ?? value) : 'Sin estado';
  }

  private async load(id: string): Promise<void> {
    this.isLoading.set(true);
    this.error.set(null);
    try {
      const versions = await this.assessments.getQuestionVersions(id);
      // Si mientras cargaba se cambió de pregunta, se descarta esta respuesta.
      if (this.questionId() !== id) return;
      this.versions.set(versions);
    } catch (error) {
      if (this.questionId() !== id) return;
      this.error.set(error instanceof Error ? error.message : 'Error inesperado');
    } finally {
      if (this.questionId() === id) this.isLoading.set(false);
    }
  }
}
