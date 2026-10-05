import {
  ChangeDetectionStrategy,
  Component,
  HostListener,
  computed,
  inject,
  signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { ToastService } from '@shared/ui/toast/toast.service';
import { AssessmentsService } from '@core/assessments/assessments.service';
import {
  QUESTION_CATEGORIES,
  QUESTION_DIFFICULTIES,
  QuestionDetail,
} from '@core/assessments/assessments.types';

type FilterMode = 'all' | 'level' | 'category';

/** Fila de la tabla: unifica el listado completo y los listados por filtro. */
interface QuestionRow {
  question_id: string;
  text: string;
  difficulty: string | null;
  category: string | null;
  status: string | null;
}

const PAGE_SIZE = 10;

@Component({
  selector: 'app-question-bank',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './question-bank.component.html',
  styleUrl: './question-bank.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class QuestionBankComponent {
  private readonly assessments = inject(AssessmentsService);
  private readonly toast = inject(ToastService);

  /** Etiqueta legible de dificultad (por si el backend manda en inglés). */
  difficultyLabel(value: string | null): string {
    if (!value) return 'Sin dificultad';
    const map: Record<string, string> = {
      easy: 'Básico',
      medium: 'Intermedio',
      hard: 'Avanzado',
      básico: 'Básico',
      intermedio: 'Intermedio',
      avanzado: 'Avanzado',
    };
    return map[value.toLowerCase()] ?? value;
  }

  /** Categoría/clasificación: 'Sin clasificar' cuando la pregunta aún no fue clasificada. */
  categoryLabel(value: string | null): string {
    return value && value.trim().length > 0 ? value : 'Sin clasificar';
  }

  /** Estado de la pregunta traducido. */
  statusLabel(value: string | null): string {
    if (!value) return 'Sin estado';
    const map: Record<string, string> = {
      draft: 'Borrador',
      published: 'Publicada',
      archived: 'Archivada',
    };
    return map[value.toLowerCase()] ?? value;
  }

  readonly difficulties = QUESTION_DIFFICULTIES;
  readonly categories = signal<readonly string[]>(QUESTION_CATEGORIES);

  readonly mode = signal<FilterMode>('all');
  readonly selectedValue = signal<string>(QUESTION_DIFFICULTIES[0]);

  readonly rows = signal<QuestionRow[]>([]);
  readonly total = signal(0);
  readonly page = signal(0);
  readonly pageSize = PAGE_SIZE;

  readonly isLoadingList = signal(false);
  readonly listError = signal<string | null>(null);

  readonly selectedId = signal<string | null>(null);
  readonly detail = signal<QuestionDetail | null>(null);
  readonly isLoadingDetail = signal(false);
  readonly detailError = signal<string | null>(null);
  readonly isDetailOpen = signal(false);

  /** Pregunta a la que se le pidió confirmar la desactivación (abre el modal de confirmación). */
  readonly confirmingId = signal<string | null>(null);
  readonly confirmingQuestion = computed(
    () => this.rows().find((r) => r.question_id === this.confirmingId()) ?? null,
  );
  /** Pregunta que se está desactivando (bloquea los botones de esa fila). */
  readonly disablingId = signal<string | null>(null);

  readonly totalPages = computed(() =>
    this.total() > 0 ? Math.ceil(this.total() / this.pageSize) : 0,
  );

  constructor() {
    void this.loadCategories();
    void this.loadAll(0);
  }

  private async loadCategories(): Promise<void> {
    try {
      const categories = await this.assessments.getCategories();
      if (categories.length > 0) {
        this.categories.set(categories);
      }
    } catch {
      // Silencioso: se mantiene el fallback local.
    }
  }

  /** Carga el listado completo paginado (modo "Todas"). */
  async loadAll(page = 0): Promise<void> {
    this.mode.set('all');
    this.listError.set(null);
    this.isLoadingList.set(true);
    try {
      const result = await this.assessments.getAllQuestions(page, this.pageSize);
      this.rows.set(
        result.questions.map((q) => ({
          question_id: q.question_id,
          text: q.text_to_evaluate,
          difficulty: q.difficulty ?? null,
          category: q.classification ?? null,
          status: q.status ?? null,
        })),
      );
      this.total.set(result.total);
      this.page.set(page);
    } catch (error) {
      this.rows.set([]);
      this.total.set(0);
      this.listError.set(error instanceof Error ? error.message : 'Error inesperado');
    } finally {
      this.isLoadingList.set(false);
    }
  }

  setMode(mode: FilterMode): void {
    if (this.mode() === mode) {
      return;
    }
    if (mode === 'all') {
      void this.loadAll(0);
      return;
    }
    this.mode.set(mode);
    this.selectedValue.set(
      mode === 'level' ? this.difficulties[0] : (this.categories()[0] ?? ''),
    );
  }

  onValueChange(value: string): void {
    this.selectedValue.set(value);
  }

  /** Busca por el filtro activo (dificultad o categoría). */
  async search(): Promise<void> {
    const mode = this.mode();
    if (mode === 'all') {
      await this.loadAll(0);
      return;
    }

    this.listError.set(null);
    this.isLoadingList.set(true);
    try {
      const value = this.selectedValue();
      const result =
        mode === 'level'
          ? await this.assessments.getQuestionsByLevel(value)
          : await this.assessments.getQuestionsByCategory(value);

      this.rows.set(
        result.map((q) => ({
          question_id: q.question_id,
          text: q.text_to_evaluate,
          difficulty: mode === 'level' ? value : null,
          category: mode === 'category' ? value : null,
          status: null,
        })),
      );
      this.total.set(result.length);
      this.page.set(0);
    } catch (error) {
      this.rows.set([]);
      this.total.set(0);
      this.listError.set(error instanceof Error ? error.message : 'Error inesperado');
    } finally {
      this.isLoadingList.set(false);
    }
  }

  async nextPage(): Promise<void> {
    if (this.mode() === 'all' && this.page() + 1 < this.totalPages()) {
      await this.loadAll(this.page() + 1);
    }
  }

  async prevPage(): Promise<void> {
    if (this.mode() === 'all' && this.page() > 0) {
      await this.loadAll(this.page() - 1);
    }
  }

  async selectQuestion(id: string): Promise<void> {
    this.isDetailOpen.set(true);
    if (this.selectedId() === id) {
      return;
    }
    this.selectedId.set(id);
    this.detail.set(null);
    this.detailError.set(null);
    this.isLoadingDetail.set(true);

    try {
      const detail = await this.assessments.getQuestionById(id);
      this.detail.set(detail);
      if (!detail) {
        this.detailError.set('No se encontró el detalle de la pregunta');
      }
    } catch (error) {
      this.detailError.set(error instanceof Error ? error.message : 'Error inesperado');
    } finally {
      this.isLoadingDetail.set(false);
    }
  }

  closeDetail(): void {
    this.isDetailOpen.set(false);
  }

  askDisable(id: string): void {
    this.confirmingId.set(id);
  }

  cancelDisable(): void {
    if (this.disablingId()) return;
    this.confirmingId.set(null);
  }

  /** Escape cierra el modal de confirmación (no mientras se está desactivando). */
  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.confirmingId()) this.cancelDisable();
  }

  /**
   * Desactiva la pregunta. El backend la oculta de los listados y de las evaluaciones, y esta
   * pantalla no puede listar las desactivadas, así que se pide confirmación antes.
   */
  async disableQuestion(id: string): Promise<void> {
    if (this.disablingId()) return;
    this.disablingId.set(id);
    try {
      const response = await this.assessments.updateQuestionStatus(id, false);
      if (!response.is_success) {
        throw new Error(response.message || 'No se pudo desactivar la pregunta.');
      }
      this.toast.success('Pregunta desactivada', 'Ya no aparece en el banco de preguntas.');
      this.confirmingId.set(null);
      if (this.selectedId() === id) {
        this.isDetailOpen.set(false);
        this.selectedId.set(null);
      }
      await this.refreshAfterDisable(id);
    } catch (error) {
      this.toast.error(
        'No se pudo desactivar la pregunta',
        error instanceof Error ? error.message : 'Error inesperado',
      );
    } finally {
      this.disablingId.set(null);
    }
  }

  /** Recarga la página actual; si quedó vacía vuelve a la anterior. En los filtros solo quita la fila. */
  private async refreshAfterDisable(id: string): Promise<void> {
    if (this.mode() !== 'all') {
      this.rows.update((rows) => rows.filter((r) => r.question_id !== id));
      this.total.update((total) => Math.max(0, total - 1));
      return;
    }
    const lastPageEmptied = this.rows().length === 1 && this.page() > 0;
    await this.loadAll(lastPageEmptied ? this.page() - 1 : this.page());
  }
}
