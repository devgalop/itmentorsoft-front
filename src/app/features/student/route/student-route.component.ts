import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { AuthService } from '@core/auth/auth.service';
import { ContentService } from '@core/content/content.service';
import { RecommendedTopic } from '@core/content/content.types';
import { ToastService } from '@shared/ui/toast/toast.service';

@Component({
  selector: 'app-student-route',
  standalone: true,
  templateUrl: './student-route.component.html',
  styleUrl: './student-route.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StudentRouteComponent {
  private readonly auth = inject(AuthService);
  private readonly content = inject(ContentService);
  private readonly toast = inject(ToastService);

  readonly topics = signal<RecommendedTopic[]>([]);
  readonly isLoading = signal(true);
  readonly loadError = signal<string | null>(null);

  /** content_id del recurso que se está abriendo (para mostrar el spinner en ese item). */
  readonly openingId = signal<string | null>(null);

  /** content_id del recurso que se está calificando (deshabilita sus estrellas mientras tanto). */
  readonly ratingId = signal<string | null>(null);
  /** Calificación del estudiante por content_id: las ya guardadas en el backend más las de esta sesión. */
  readonly myRatings = signal<Record<string, number>>({});

  /** Cantidad total de contenidos recomendados en toda la ruta. */
  readonly totalContents = computed(() =>
    this.topics().reduce((acc, t) => acc + t.contents.length, 0),
  );

  constructor() {
    const id = this.auth.userId();
    if (id) {
      void this.load(id);
    } else {
      this.isLoading.set(false);
      this.loadError.set('No se pudo identificar tu usuario. Iniciá sesión de nuevo.');
    }
  }

  async load(id: string): Promise<void> {
    this.isLoading.set(true);
    this.loadError.set(null);
    try {
      const recommendation = await this.content.getRecommendedLearningPaths(id);
      this.topics.set(recommendation);
      await this.loadMyRatings(id);
    } catch (error) {
      this.loadError.set(
        error instanceof Error ? error.message : 'No se pudo cargar tu ruta de aprendizaje.',
      );
    } finally {
      this.isLoading.set(false);
    }
  }

  /**
   * Trae las calificaciones previas del estudiante para mostrarlas y poder editarlas.
   * No es crítico: si falla (o no hay ninguna) la ruta se muestra igual, sin calificar.
   */
  private async loadMyRatings(id: string): Promise<void> {
    try {
      const ratings = await this.content.getRatingsByUser(id);
      const saved = Object.fromEntries(ratings.map((r) => [r.content_id, r.rating]));
      // Lo calificado en esta sesión tiene prioridad sobre lo que traiga el backend.
      this.myRatings.update((current) => ({ ...saved, ...current }));
    } catch {
      // Sin calificaciones previas: se deja como está.
    }
  }

  /** Estrellas llenas (0–5) a partir del rating. */
  stars(rating: number): number {
    return Math.max(0, Math.min(5, Math.round(rating)));
  }

  /** Envía la calificación del estudiante (1-5); si ya había calificado el recurso, la modifica. */
  async rate(contentId: string, value: number): Promise<void> {
    const userId = this.auth.userId();
    if (!userId || this.ratingId()) return;
    const isEdit = this.myRatings()[contentId] !== undefined;
    this.ratingId.set(contentId);
    try {
      const payload = { content_id: contentId, user_id: userId, rating: value };
      const response = isEdit
        ? await this.content.updateRating(payload)
        : await this.content.rateContent(payload);
      if (!response.is_success) {
        throw new Error(response.message || 'No se pudo enviar tu calificación.');
      }
      this.myRatings.update((ratings) => ({ ...ratings, [contentId]: value }));
      this.toast.success(
        isEdit ? 'Calificación actualizada' : '¡Gracias por calificar!',
        'Tu opinión ayuda a mejorar la ruta.',
      );
    } catch (error) {
      this.toast.error(
        'No se pudo enviar tu calificación',
        error instanceof Error ? error.message : 'Error inesperado',
      );
    } finally {
      this.ratingId.set(null);
    }
  }

  /**
   * La recomendación no trae la URL del recurso, así que se busca el detalle
   * al hacer click y recién ahí se abre en una pestaña nueva.
   */
  async openResource(contentId: string): Promise<void> {
    if (this.openingId()) return;
    this.openingId.set(contentId);
    try {
      const detail = await this.content.getContentById(contentId);
      if (!detail?.url) {
        this.toast.error('No se pudo abrir', 'No encontramos el recurso solicitado.');
        return;
      }
      window.open(detail.url, '_blank', 'noopener');
    } catch (error) {
      this.toast.error(
        'No se pudo abrir el recurso',
        error instanceof Error ? error.message : 'Error inesperado',
      );
    } finally {
      this.openingId.set(null);
    }
  }
}
