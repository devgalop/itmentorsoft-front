import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { AssessmentsService } from '@core/assessments/assessments.service';
import { ContentService } from '@core/content/content.service';
import { CONTENT_CATEGORIES, contentCategoryLabel, ContentItem } from '@core/content/content.types';

const PAGE_SIZE = 12;

/**
 * Explorar recursos: buscador general de contenidos (independiente de "Mi ruta",
 * que solo muestra lo recomendado). Combina los 4 filtros que expone el backend:
 * título, categoría, tema, y categoría+tema a la vez.
 */
@Component({
  selector: 'app-student-explore',
  standalone: true,
  templateUrl: './student-explore.component.html',
  styleUrl: './student-explore.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StudentExploreComponent {
  private readonly content = inject(ContentService);
  private readonly assessments = inject(AssessmentsService);

  readonly categoryOptions = CONTENT_CATEGORIES;
  readonly topicOptions = signal<string[]>([]);
  readonly isLoadingTopics = signal(false);

  /** Valor del input mientras se escribe (no dispara búsqueda por sí solo). */
  readonly titleDraft = signal('');
  /** Título efectivamente buscado (se confirma con el botón "Buscar" o Enter). */
  readonly searchTitle = signal('');
  readonly filterCategory = signal('all');
  readonly filterTopic = signal('all');

  /** El backend rechaza títulos de menos de 3 caracteres; se valida antes de buscar. */
  readonly titleTooShort = computed(() => {
    const len = this.titleDraft().trim().length;
    return len > 0 && len < 3;
  });

  readonly resources = signal<ContentItem[]>([]);
  readonly total = signal(0);
  readonly page = signal(0);
  readonly pageSize = PAGE_SIZE;

  readonly isLoading = signal(false);
  readonly loadError = signal<string | null>(null);

  readonly totalPages = computed(() =>
    this.total() > 0 ? Math.ceil(this.total() / this.pageSize) : 0,
  );

  /** Título tiene prioridad; si no hay título, se combinan categoría y tema. */
  readonly hasActiveFilter = computed(
    () =>
      this.searchTitle().trim() !== '' ||
      this.filterCategory() !== 'all' ||
      this.filterTopic() !== 'all',
  );

  constructor() {
    void this.loadTopics();
    void this.search(0);
  }

  categoryLabel(value: string): string {
    return contentCategoryLabel(value);
  }

  private async loadTopics(): Promise<void> {
    this.isLoadingTopics.set(true);
    try {
      this.topicOptions.set(await this.assessments.getTopics());
    } catch {
      this.topicOptions.set([]);
    } finally {
      this.isLoadingTopics.set(false);
    }
  }

  onTitleInput(value: string): void {
    this.titleDraft.set(value);
  }

  /** Confirma la búsqueda por título (botón "Buscar" o Enter). */
  onSearchSubmit(): void {
    if (this.titleTooShort()) return;
    this.searchTitle.set(this.titleDraft().trim());
    void this.search(0);
  }

  onCategoryChange(value: string): void {
    this.filterCategory.set(value);
    void this.search(0);
  }

  onTopicChange(value: string): void {
    this.filterTopic.set(value);
    void this.search(0);
  }

  clearFilters(): void {
    this.titleDraft.set('');
    this.searchTitle.set('');
    this.filterCategory.set('all');
    this.filterTopic.set('all');
    void this.search(0);
  }

  async search(page: number): Promise<void> {
    this.isLoading.set(true);
    this.loadError.set(null);
    try {
      const title = this.searchTitle().trim();
      const category = this.filterCategory();
      const topic = this.filterTopic();

      const result = title
        ? await this.content.getContentsByTitle(title, page, this.pageSize)
        : category !== 'all' && topic !== 'all'
          ? await this.content.getContentsByCategoryTopic(category, topic, page, this.pageSize)
          : category !== 'all'
            ? await this.content.getContentsByCategory(category, page, this.pageSize)
            : topic !== 'all'
              ? await this.content.getContentsByTopic(topic, page, this.pageSize)
              : await this.content.getAllContentsPaged(page, this.pageSize);

      this.resources.set(result.items);
      this.total.set(result.total);
      this.page.set(page);
    } catch (error) {
      this.resources.set([]);
      this.total.set(0);
      this.loadError.set(error instanceof Error ? error.message : 'No se pudieron cargar los recursos.');
    } finally {
      this.isLoading.set(false);
    }
  }

  async nextPage(): Promise<void> {
    if (this.page() + 1 < this.totalPages()) {
      await this.search(this.page() + 1);
    }
  }

  async prevPage(): Promise<void> {
    if (this.page() > 0) {
      await this.search(this.page() - 1);
    }
  }
}
