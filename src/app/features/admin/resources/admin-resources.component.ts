import {
  ChangeDetectionStrategy,
  Component,
  HostListener,
  computed,
  inject,
  signal,
} from '@angular/core';
import { ContentService } from '@core/content/content.service';
import { contentCategoryLabel, ContentItem } from '@core/content/content.types';
import { ToastService } from '@shared/ui/toast/toast.service';

const PAGE_SIZE = 10;

/**
 * Recursos (admin): listado de los recursos activos y desactivación. El backend oculta de todos
 * los listados lo desactivado y no ofrece cómo listarlo, por eso se confirma antes y desde aquí
 * no se puede volver a activar.
 */
@Component({
  selector: 'app-admin-resources',
  standalone: true,
  templateUrl: './admin-resources.component.html',
  styleUrl: './admin-resources.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminResourcesComponent {
  private readonly content = inject(ContentService);
  private readonly toast = inject(ToastService);

  readonly resources = signal<ContentItem[]>([]);
  readonly total = signal(0);
  readonly page = signal(0);
  readonly pageSize = PAGE_SIZE;
  readonly isLoading = signal(false);
  readonly loadError = signal<string | null>(null);

  readonly totalPages = computed(() =>
    this.total() > 0 ? Math.ceil(this.total() / this.pageSize) : 0,
  );

  /** Recurso a desactivar (abre el modal de confirmación). */
  readonly confirmingId = signal<string | null>(null);
  readonly confirmingResource = computed(
    () => this.resources().find((r) => r.content_id === this.confirmingId()) ?? null,
  );
  /** Recurso que se está desactivando (bloquea el modal). */
  readonly disablingId = signal<string | null>(null);

  constructor() {
    void this.load(0);
  }

  categoryLabel(value: string): string {
    return contentCategoryLabel(value);
  }

  async load(page: number): Promise<void> {
    this.isLoading.set(true);
    this.loadError.set(null);
    try {
      const result = await this.content.getAllContentsPaged(page, this.pageSize);
      this.resources.set(result.items);
      this.total.set(result.total);
      this.page.set(page);
    } catch (error) {
      this.resources.set([]);
      this.total.set(0);
      this.loadError.set(error instanceof Error ? error.message : 'Error inesperado');
    } finally {
      this.isLoading.set(false);
    }
  }

  async nextPage(): Promise<void> {
    if (this.page() + 1 < this.totalPages()) await this.load(this.page() + 1);
  }

  async prevPage(): Promise<void> {
    if (this.page() > 0) await this.load(this.page() - 1);
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

  async disableResource(id: string): Promise<void> {
    if (this.disablingId()) return;
    this.disablingId.set(id);
    try {
      const response = await this.content.updateResourceStatus(id, false);
      if (!response.is_success) {
        throw new Error(response.message || 'No se pudo desactivar el recurso.');
      }
      this.toast.success('Recurso desactivado', 'Ya no aparece en los listados.');
      this.confirmingId.set(null);
      // Recarga la página actual; si quedó vacía vuelve a la anterior.
      const lastPageEmptied = this.resources().length === 1 && this.page() > 0;
      await this.load(lastPageEmptied ? this.page() - 1 : this.page());
    } catch (error) {
      this.toast.error(
        'No se pudo desactivar el recurso',
        error instanceof Error ? error.message : 'Error inesperado',
      );
    } finally {
      this.disablingId.set(null);
    }
  }
}
