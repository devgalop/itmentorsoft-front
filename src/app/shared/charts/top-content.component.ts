import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { AssessmentsService } from '@core/assessments/assessments.service';
import { ContentService } from '@core/content/content.service';
import { TopContentItem } from '@core/content/content.types';

/**
 * Contenidos mejor y peor valorados de un tema. El backend permite consultarlos a admin,
 * docente y estudiante; se usa en las pantallas del admin y del docente.
 */
@Component({
  selector: 'app-top-content',
  standalone: true,
  templateUrl: './top-content.component.html',
  styleUrl: './top-content.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TopContentComponent {
  private readonly assessments = inject(AssessmentsService);
  private readonly content = inject(ContentService);

  readonly topics = signal<string[]>([]);
  readonly selectedTopic = signal('');
  readonly topBest = signal<TopContentItem[]>([]);
  readonly topWorse = signal<TopContentItem[]>([]);
  readonly isLoadingTop = signal(false);
  /** true si falló alguna de las dos consultas (o el tema no tiene contenidos calificados). */
  readonly topUnavailable = signal(false);

  constructor() {
    void this.loadTopics();
  }

  onTopicChange(topic: string): void {
    void this.loadTop(topic);
  }

  /** Estrellas llenas (0–5) a partir del rating, para mostrar la valoración. */
  stars(rating: number): number {
    return Math.max(0, Math.min(5, Math.round(rating)));
  }

  /** Rating con un solo decimal (el backend manda el promedio completo, p. ej. 4.3333). */
  formatRating(rating: number): string {
    return rating.toFixed(1);
  }

  private async loadTopics(): Promise<void> {
    try {
      const topics = await this.assessments.getTopics();
      this.topics.set(topics);
      const first = topics[0];
      if (first !== undefined) await this.loadTop(first);
    } catch {
      this.topics.set([]);
    }
  }

  private async loadTop(topic: string): Promise<void> {
    this.selectedTopic.set(topic);
    this.isLoadingTop.set(true);
    this.topUnavailable.set(false);
    const [best, worse] = await Promise.allSettled([
      this.content.getTopBestContent(topic),
      this.content.getTopWorseContent(topic),
    ]);
    // Si el usuario cambió de tema mientras cargaba, se descarta esta respuesta.
    if (this.selectedTopic() !== topic) return;
    this.topBest.set(best.status === 'fulfilled' ? best.value : []);
    this.topWorse.set(worse.status === 'fulfilled' ? worse.value : []);
    this.topUnavailable.set(best.status === 'rejected' || worse.status === 'rejected');
    this.isLoadingTop.set(false);
  }
}
