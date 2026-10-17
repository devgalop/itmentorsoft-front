import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { AuthService } from '@core/auth/auth.service';
import { ContentService } from '@core/content/content.service';
import { RecommendedContent, RecommendedTopic } from '@core/content/content.types';
import { CATEGORY_PALETTE, FALLBACK_COLOR } from '@shared/charts/chart-colors';
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
  /** El backend dice que la ruta ya existe, pero no se pudo traer (caso raro: se puede reintentar). */
  readonly unavailable = signal(false);

  /** content_id del recurso que se está abriendo (para mostrar el spinner en ese item). */
  readonly openingId = signal<string | null>(null);

  /** Temas desplegados (por `topicKey`). Al cargar, solo el primero. */
  readonly openTopics = signal<ReadonlySet<string>>(new Set());

  /** Identificador estable de un tema dentro de la pantalla. */
  topicKey(topic: RecommendedTopic): string {
    return topic.topic_path_id ?? topic.topic;
  }

  isTopicOpen(topic: RecommendedTopic): boolean {
    return this.openTopics().has(this.topicKey(topic));
  }

  toggleTopic(topic: RecommendedTopic): void {
    const key = this.topicKey(topic);
    this.openTopics.update((open) => {
      const next = new Set(open);
      if (!next.delete(key)) next.add(key);
      return next;
    });
  }

  /** Color del tema (el mismo orden de la paleta que usan las gráficas). */
  topicColor(index: number): string {
    return CATEGORY_PALETTE[index] ?? FALLBACK_COLOR;
  }

  /** Cuántos recursos de un tema ya están vistos. */
  doneCount(topic: RecommendedTopic): number {
    return topic.contents.filter((c) => this.isDone(topic, c)).length;
  }

  /** Resumen de toda la ruta: temas, recursos, vistos y avance general (0–100). */
  readonly overview = computed(() => {
    const topics = this.topics();
    const total = this.totalContents();
    const done = topics.reduce((sum, t) => sum + this.doneCount(t), 0);
    const reported = topics.map((t) => t.progress).filter((p): p is number => p !== undefined);
    const overall = reported.length > 0
      ? Math.round(reported.reduce((a, b) => a + b, 0) / reported.length)
      : total > 0
        ? Math.round((done / total) * 100)
        : 0;
    return { topics: topics.length, total, done, overall: Math.max(0, Math.min(100, overall)) };
  });

  /** Recurso cuyo estado se está guardando ("pathId|contentId"). */
  readonly savingKey = signal<string | null>(null);

  /** Clave de un recurso dentro de un tema. */
  doneKey(topic: RecommendedTopic, contentId: string): string {
    return `${topic.topic_path_id ?? topic.topic}|${contentId}`;
  }

  /** Un recurso está visto según lo que informa el backend. */
  isDone(_topic: RecommendedTopic, item: RecommendedContent): boolean {
    return item.is_completed === true;
  }

  /** Marca el recurso como visto (o lo vuelve a pendiente) y actualiza el avance del tema. */
  async toggleDone(topic: RecommendedTopic, item: RecommendedContent): Promise<void> {
    const userId = this.auth.userId();
    const pathId = topic.topic_path_id;
    if (!userId || !pathId || this.savingKey()) return;
    const key = this.doneKey(topic, item.content_id);
    const next = !this.isDone(topic, item);
    this.savingKey.set(key);
    try {
      const progress = await this.content.setLearningPathContentStatus(pathId, item.content_id, next);
      this.topics.update((list) =>
        list.map((t) =>
          t.topic_path_id === pathId
            ? {
                ...t,
                progress,
                contents: t.contents.map((c) => (c.content_id === item.content_id ? { ...c, is_completed: next } : c)),
              }
            : t,
        ),
      );
    } catch (error) {
      this.toast.error(
        'No se pudo actualizar el recurso',
        error instanceof Error ? error.message : 'Error inesperado',
      );
    } finally {
      this.savingKey.set(null);
    }
  }

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
      this.loadError.set('No se pudo identificar tu usuario. Inicia sesión de nuevo.');
    }
  }

  async load(id: string): Promise<void> {
    this.isLoading.set(true);
    this.loadError.set(null);
    this.unavailable.set(false);
    try {
      await this.loadPath(id);
      await this.loadMyRatings(id);
    } catch (error) {
      this.loadError.set(
        error instanceof Error ? error.message : 'No se pudo cargar tu ruta de aprendizaje.',
      );
    } finally {
      this.isLoading.set(false);
    }
  }

  /** Vuelve a intentarlo (botón "Reintentar"). */
  retry(): void {
    const id = this.auth.userId();
    if (id) void this.load(id);
  }

  /**
   * Trae las rutas del estudiante; si todavía no tiene, las genera a partir de su perfil y las
   * vuelve a pedir. De cada tema se muestra la ruta más reciente que siga sin completar.
   */
  private async loadPath(id: string): Promise<void> {
    let paths = await this.content.getCompleteLearningPaths(id);
    if (paths.length === 0) {
      const generated = await this.content.generateLearningPath(id);
      if (!generated.created) {
        this.topics.set([]);
        if (generated.reason === 'exists') this.unavailable.set(true);
        else if (generated.reason === 'failed') this.loadError.set('No se pudo generar tu ruta de aprendizaje.');
        return;
      }
      paths = await this.content.getCompleteLearningPaths(id);
    }
    const topics = this.activePerTopic(paths);
    this.topics.set(topics);
    this.openTopics.set(new Set(topics[0] ? [this.topicKey(topics[0])] : []));
  }

  /**
   * El backend entrega todas las rutas (también las repetidas y las completadas), de la más
   * reciente a la más antigua. Por tema se toma la más reciente sin completar o, si todas están
   * completas, la más reciente.
   */
  private activePerTopic(paths: RecommendedTopic[]): RecommendedTopic[] {
    const chosen = new Map<string, RecommendedTopic>();
    for (const p of paths) {
      const current = chosen.get(p.topic);
      if (!current || (current.is_completed && !p.is_completed)) chosen.set(p.topic, p);
    }
    return [...chosen.values()];
  }

  /** Avance de un tema redondeado a 0–100. */
  progressPct(topic: RecommendedTopic): number {
    return Math.max(0, Math.min(100, Math.round(topic.progress ?? 0)));
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

  /**
   * Al calificar, el promedio de todos los estudiantes (★ 4.5) cambia en el backend. Se vuelve a
   * pedir solo para actualizar ese número, sin tocar el resto de la pantalla (temas abiertos,
   * recursos vistos). No es crítico: si falla, el promedio se ve al recargar.
   */
  private async refreshAverages(userId: string): Promise<void> {
    try {
      const paths = await this.content.getCompleteLearningPaths(userId);
      const averages = new Map<string, number>();
      for (const path of paths) {
        for (const c of path.contents) averages.set(c.content_id, c.rating);
      }
      this.topics.update((topics) =>
        topics.map((t) => ({
          ...t,
          contents: t.contents.map((c) => (averages.has(c.content_id) ? { ...c, rating: averages.get(c.content_id)! } : c)),
        })),
      );
    } catch {
      // Se queda con el promedio anterior.
    }
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
      await this.refreshAverages(userId);
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
