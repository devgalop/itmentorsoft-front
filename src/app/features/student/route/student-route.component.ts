import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { AuthService } from '@core/auth/auth.service';
import { ContentService } from '@core/content/content.service';
import { RecommendedTopic } from '@core/content/content.types';

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

  readonly topics = signal<RecommendedTopic[]>([]);
  readonly isLoading = signal(true);
  readonly loadError = signal<string | null>(null);

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
    } catch (error) {
      this.loadError.set(
        error instanceof Error ? error.message : 'No se pudo cargar tu ruta de aprendizaje.',
      );
    } finally {
      this.isLoading.set(false);
    }
  }

  /** Estrellas llenas (0–5) a partir del rating. */
  stars(rating: number): number {
    return Math.max(0, Math.min(5, Math.round(rating)));
  }
}
