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
import {
  CONTENT_CATEGORIES,
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

  readonly categories = CONTENT_CATEGORIES;

  readonly resources = signal<ContentItem[]>([]);
  readonly isLoading = signal(false);
  readonly loadError = signal<string | null>(null);

  readonly isModalOpen = signal(false);
  readonly isSubmitting = signal(false);
  readonly submitError = signal<string | null>(null);
  readonly submitSuccess = signal<string | null>(null);

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

  openModal(): void {
    this.submitError.set(null);
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
    this.submitError.set(null);
    this.submitSuccess.set(null);

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.isSubmitting.set(true);
    const payload = this.form.getRawValue() as RegisterContentPayload;

    try {
      const response = await this.content.registerContent(payload);
      if (response.is_success) {
        this.submitSuccess.set(response.message || 'Recurso creado correctamente');
        this.resetForm();
        this.closeModal();
        await this.loadResources();
      } else {
        this.submitError.set(response.message || 'No se pudo crear el recurso');
      }
    } catch (error) {
      this.submitError.set(error instanceof Error ? error.message : 'Error inesperado');
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
