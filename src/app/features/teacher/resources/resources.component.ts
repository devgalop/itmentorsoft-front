import { ChangeDetectionStrategy, Component, ElementRef, HostListener, inject, signal } from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { ContentService } from '@core/content/content.service';
import { AssessmentsService } from '@core/assessments/assessments.service';
import { ToastService } from '@shared/ui/toast/toast.service';
import {
  CONTENT_CATEGORIES,
  contentCategoryLabel,
  ContentItem,
  RegisterContentPayload,
} from '@core/content/content.types';

/** Requiere al menos `min` elementos seleccionados en un control de tipo string[]. */
function minSelected(min: number) {
  return (control: AbstractControl): ValidationErrors | null => {
    const value = (control.value ?? []) as string[];
    return value.length >= min ? null : { minSelected: { required: min, actual: value.length } };
  };
}

function httpsUrl(control: AbstractControl): ValidationErrors | null {
  const value = (control.value ?? '') as string;
  if (!value) return null;
  return value.startsWith('https://') ? null : { https: true };
}

@Component({
  selector: 'app-resources',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './resources.component.html',
  styleUrl: './resources.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ResourcesComponent {
  private readonly fb = inject(FormBuilder);
  private readonly content = inject(ContentService);
  private readonly assessments = inject(AssessmentsService);
  private readonly toast = inject(ToastService);
  private readonly host = inject(ElementRef<HTMLElement>);

  /** Estado abierto/cerrado del desplegable de temas. */
  readonly isTopicsOpen = signal(false);

  toggleTopicsDropdown(): void {
    this.isTopicsOpen.update((open) => !open);
  }

  /** Texto del botón del combobox según lo seleccionado. */
  topicsSummary(): string {
    const selected = this.selectedTopics();
    if (selected.length === 0) return 'Seleccioná uno o más temas';
    if (selected.length === 1) return selected[0]!;
    return `${selected.length} temas seleccionados`;
  }

  /** Cierra el desplegable al hacer click fuera del componente. */
  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (this.isTopicsOpen() && !this.host.nativeElement.contains(event.target)) {
      this.isTopicsOpen.set(false);
    }
  }

  /** Categorías/temas disponibles para marcar (de GET /assessments/topics). */
  readonly availableTopics = signal<string[]>([]);
  readonly isLoadingTopics = signal(false);

  categoryLabel(value: string): string {
    return contentCategoryLabel(value);
  }

  readonly resources = signal<ContentItem[]>([]);
  readonly isLoading = signal(false);
  readonly loadError = signal<string | null>(null);

  readonly isModalOpen = signal(false);
  readonly isSubmitting = signal(false);

  /** Id del recurso en edición; null = creando. */
  readonly editingId = signal<string | null>(null);

  readonly form = this.fb.nonNullable.group({
    title: ['', [Validators.required, Validators.minLength(5), Validators.maxLength(150)]],
    description: ['', [Validators.required, Validators.minLength(10), Validators.maxLength(300)]],
    url: ['', [Validators.required, httpsUrl]],
    category: [CONTENT_CATEGORIES[0] as string, [Validators.required]],
    related_topic: this.fb.nonNullable.control<string[]>([], [minSelected(1)]),
  });

  constructor() {
    void this.loadResources();
    void this.loadTopics();
  }

  private get topicsControl() {
    return this.form.controls.related_topic;
  }

  /** Categorías seleccionadas actualmente. */
  selectedTopics(): string[] {
    return this.topicsControl.value ?? [];
  }

  async loadTopics(): Promise<void> {
    this.isLoadingTopics.set(true);
    try {
      const topics = await this.assessments.getTopics();
      this.availableTopics.set(topics);
    } catch {
      this.availableTopics.set([]);
    } finally {
      this.isLoadingTopics.set(false);
    }
  }

  isTopicSelected(topic: string): boolean {
    return (this.topicsControl.value ?? []).includes(topic);
  }

  toggleTopic(topic: string): void {
    const current = this.topicsControl.value ?? [];
    const next = current.includes(topic)
      ? current.filter((t) => t !== topic)
      : [...current, topic];
    this.topicsControl.setValue(next);
    this.topicsControl.markAsTouched();
  }

  async loadResources(): Promise<void> {
    this.isLoading.set(true);
    this.loadError.set(null);
    try {
      this.resources.set(await this.content.getAllContents());
    } catch (error) {
      this.loadError.set(error instanceof Error ? error.message : 'Error al cargar recursos');
    } finally {
      this.isLoading.set(false);
    }
  }

  openCreate(): void {
    this.editingId.set(null);
    this.resetForm();
    this.isModalOpen.set(true);
  }

  /** Abre el modal en modo edición, precargando el recurso (summary -> description). */
  openEdit(resource: ContentItem): void {
    this.editingId.set(resource.content_id);

    this.form.patchValue({
      title: resource.title,
      description: resource.summary,
      url: resource.url,
      category: resource.category,
      related_topic: resource.related_topics ?? [],
    });

    this.isModalOpen.set(true);
  }

  closeModal(): void {
    this.isModalOpen.set(false);
  }

  fieldError(control: AbstractControl | null): string | null {
    if (!control || !control.touched || !control.errors) {
      return null;
    }
    const e = control.errors;
    if (e['required']) return 'Requerido';
    if (e['minlength']) return `Mínimo ${e['minlength'].requiredLength} caracteres`;
    if (e['maxlength']) return `Máximo ${e['maxlength'].requiredLength} caracteres`;
    if (e['https']) return 'Debe empezar con https://';
    if (e['minSelected']) return 'Seleccioná al menos un tema';
    return 'Inválido';
  }

  async submit(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.isSubmitting.set(true);
    const payload = this.form.getRawValue() as RegisterContentPayload;
    const editingId = this.editingId();

    try {
      const response = editingId
        ? await this.content.updateContent(editingId, payload)
        : await this.content.registerContent(payload);

      if (response.is_success) {
        this.toast.success(
          editingId ? 'Recurso actualizado' : 'Recurso creado',
          editingId ? 'Los cambios se guardaron correctamente.' : 'El recurso se creó correctamente.',
        );
        this.resetForm();
        this.editingId.set(null);
        this.closeModal();
        await this.loadResources();
      } else {
        this.toast.error('No se pudo guardar', response.message || 'Intentá nuevamente.');
      }
    } catch (error) {
      this.toast.error('Error al guardar', error instanceof Error ? error.message : 'Error inesperado');
    } finally {
      this.isSubmitting.set(false);
    }
  }

  private resetForm(): void {
    this.form.reset({ category: CONTENT_CATEGORIES[0], related_topic: [] });
  }
}
