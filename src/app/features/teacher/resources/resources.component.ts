import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import {
  AbstractControl,
  FormArray,
  FormBuilder,
  FormControl,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { ContentService } from '@core/content/content.service';
import { ToastService } from '@shared/ui/toast/toast.service';
import {
  CONTENT_CATEGORIES,
  contentCategoryLabel,
  ContentItem,
  RegisterContentPayload,
} from '@core/content/content.types';

function minItems(min: number) {
  return (control: AbstractControl): ValidationErrors | null => {
    const arr = control as FormArray;
    return arr.length >= min ? null : { minItems: { required: min, actual: arr.length } };
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
  private readonly toast = inject(ToastService);

  readonly categories = CONTENT_CATEGORIES;

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
    related_topic: this.fb.array([this.newTopic()], minItems(1)),
  });

  constructor() {
    void this.loadResources();
  }

  get topics(): FormArray {
    return this.form.get('related_topic') as FormArray;
  }

  private newTopic(value = ''): FormControl {
    return this.fb.nonNullable.control(value, [Validators.required, Validators.minLength(2)]);
  }

  addTopic(): void {
    const last = this.topics.at(this.topics.length - 1);
    // No agregar otro campo si el último está vacío: marca el error en ese.
    if (last && !((last.value ?? '') as string).trim()) {
      last.markAsTouched();
      return;
    }
    this.topics.push(this.newTopic());
  }

  removeTopic(index: number): void {
    if (this.topics.length > 1) {
      this.topics.removeAt(index);
    }
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
    });

    this.topics.clear();
    const topics = resource.related_topics ?? [];
    topics.forEach((t) => this.topics.push(this.newTopic(t)));
    if (this.topics.length === 0) {
      this.topics.push(this.newTopic());
    }

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
    return 'Inválido';
  }

  async submit(): Promise<void> {

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.isSubmitting.set(true);
    const payload = this.form.getRawValue() as RegisterContentPayload;
    // Limpia temas vacíos o con espacios antes de enviar.
    payload.related_topic = (payload.related_topic ?? [])
      .map((t) => (t ?? '').trim())
      .filter((t) => t.length > 0);
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
    this.form.reset({ category: CONTENT_CATEGORIES[0] });
    this.topics.clear();
    this.topics.push(this.newTopic());
  }
}
