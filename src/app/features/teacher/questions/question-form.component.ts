import { ChangeDetectionStrategy, ChangeDetectorRef, Component, inject, signal } from '@angular/core';
import {
  AbstractControl,
  FormArray,
  FormBuilder,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { AssessmentsService } from '@core/assessments/assessments.service';
import { ToastService } from '@shared/ui/toast/toast.service';
import { QuestionDetail, RegisterQuestionPayload } from '@core/assessments/assessments.types';

/** Valida que un FormArray tenga al menos `min` elementos. */
function minItems(min: number) {
  return (control: AbstractControl): ValidationErrors | null => {
    const arr = control as FormArray;
    return arr.length >= min ? null : { minItems: { required: min, actual: arr.length } };
  };
}

@Component({
  selector: 'app-question-form',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './question-form.component.html',
  styleUrl: './question-form.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class QuestionFormComponent {
  private readonly fb = inject(FormBuilder);
  private readonly assessments = inject(AssessmentsService);
  private readonly toast = inject(ToastService);
  private readonly route = inject(ActivatedRoute);
  private readonly cdr = inject(ChangeDetectorRef);

  private questionId: string | null = null;

  readonly isEditMode = signal(false);
  readonly isLoading = signal(false);
  readonly loadError = signal<string | null>(null);

  readonly isSubmitting = signal(false);

  readonly form = this.fb.nonNullable.group({
    text: ['', [Validators.required, Validators.minLength(20), Validators.maxLength(500)]],
    concept: ['', [Validators.required, Validators.minLength(10), Validators.maxLength(150)]],
    definition: ['', [Validators.required, Validators.minLength(20), Validators.maxLength(500)]],
    simple_explanation: [
      '',
      [Validators.required, Validators.minLength(20), Validators.maxLength(300)],
    ],
    correct_sample: [
      '',
      [Validators.required, Validators.minLength(20), Validators.maxLength(300)],
    ],
    wrong_sample: ['', [Validators.required, Validators.minLength(20), Validators.maxLength(300)]],
    common_misconception: this.fb.array(
      [this.newMisconception(), this.newMisconception()],
      minItems(2),
    ),
    semantic_keywords: this.fb.array([this.newKeyword()], minItems(1)),
    rubric: this.fb.array([this.newRubric()], minItems(1)),
  });

  constructor() {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.questionId = id;
      this.isEditMode.set(true);
      void this.loadQuestion(id);
    }
  }

  get misconceptions(): FormArray {
    return this.form.get('common_misconception') as FormArray;
  }

  get keywords(): FormArray {
    return this.form.get('semantic_keywords') as FormArray;
  }

  get rubric(): FormArray {
    return this.form.get('rubric') as FormArray;
  }

  private newMisconception(value = ''): FormControl {
    return this.fb.nonNullable.control(value, [
      Validators.required,
      Validators.minLength(20),
      Validators.maxLength(300),
    ]);
  }

  private newKeyword(value = ''): FormControl {
    return this.fb.nonNullable.control(value, [
      Validators.required,
      Validators.minLength(2),
      Validators.maxLength(100),
    ]);
  }

  private newRubric(score = 0, criteria = ''): FormGroup {
    return this.fb.nonNullable.group({
      score: [score, [Validators.required, Validators.min(0), Validators.max(3)]],
      criteria: [
        criteria,
        [Validators.required, Validators.minLength(10), Validators.maxLength(300)],
      ],
    });
  }

  private async loadQuestion(id: string): Promise<void> {
    this.isLoading.set(true);
    this.loadError.set(null);
    try {
      const question = await this.assessments.getQuestionById(id);
      if (!question) {
        this.loadError.set('No se encontró la pregunta que querés editar.');
        return;
      }
      this.patchForm(question);
    } catch (error) {
      this.loadError.set(error instanceof Error ? error.message : 'Error al cargar la pregunta.');
    } finally {
      this.isLoading.set(false);
    }
  }

  /** Pre-carga el formulario con el detalle, mapeando rubric.explanation -> criteria. */
  private patchForm(q: QuestionDetail): void {
    this.form.patchValue({
      text: q.text,
      concept: q.concept,
      definition: q.definition,
      simple_explanation: q.simple_explanation,
      correct_sample: q.correct_sample,
      wrong_sample: q.wrong_sample,
    });

    const misconceptions = (q.common_misconception ?? []).filter((m) => m && m.trim().length > 0);
    this.misconceptions.clear();
    misconceptions.forEach((m) => this.misconceptions.push(this.newMisconception(m)));
    while (this.misconceptions.length < 2) {
      this.misconceptions.push(this.newMisconception());
    }

    const keywords = (q.semantic_keywords ?? []).filter((k) => k && k.trim().length > 0);
    this.keywords.clear();
    keywords.forEach((k) => this.keywords.push(this.newKeyword(k)));
    if (this.keywords.length < 1) {
      this.keywords.push(this.newKeyword());
    }

    const rubric = (q.rubric ?? []).filter(
      (r) => r && r.explanation && r.explanation.trim().length > 0,
    );
    this.rubric.clear();
    rubric.forEach((r) => this.rubric.push(this.newRubric(r.score, r.explanation)));
    if (this.rubric.length < 1) {
      this.rubric.push(this.newRubric());
    }

    // App zoneless + OnPush: mutar los FormArray no dispara render, forzamos la detección.
    this.cdr.markForCheck();
  }

  addMisconception(): void {
    this.misconceptions.push(this.newMisconception());
  }

  removeMisconception(index: number): void {
    if (this.misconceptions.length > 2) {
      this.misconceptions.removeAt(index);
    }
  }

  addKeyword(): void {
    this.keywords.push(this.newKeyword());
  }

  removeKeyword(index: number): void {
    if (this.keywords.length > 1) {
      this.keywords.removeAt(index);
    }
  }

  addRubric(): void {
    this.rubric.push(this.newRubric());
  }

  removeRubric(index: number): void {
    if (this.rubric.length > 1) {
      this.rubric.removeAt(index);
    }
  }

  /** Mensaje de error en español para un control dado. */
  fieldError(control: AbstractControl | null): string | null {
    if (!control || !control.touched || !control.errors) {
      return null;
    }
    const e = control.errors;
    if (e['required']) return 'Requerido';
    if (e['minlength']) return `Mínimo ${e['minlength'].requiredLength} caracteres`;
    if (e['maxlength']) return `Máximo ${e['maxlength'].requiredLength} caracteres`;
    if (e['min']) return `Mínimo ${e['min'].min}`;
    if (e['max']) return `Máximo ${e['max'].max}`;
    return 'Inválido';
  }

  async submit(): Promise<void> {

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.isSubmitting.set(true);
    const payload = this.form.getRawValue() as RegisterQuestionPayload;

    try {
      const response =
        this.isEditMode() && this.questionId
          ? await this.assessments.updateQuestion(this.questionId, payload)
          : await this.assessments.registerQuestion(payload);

      if (response.is_success) {
        if (this.isEditMode()) {
          this.toast.success('Pregunta actualizada', 'Los cambios se guardaron correctamente.');
        } else {
          this.toast.success('Pregunta creada', 'La pregunta se registró correctamente.');
          this.resetForm();
        }
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
    this.form.reset();
    this.misconceptions.clear();
    this.misconceptions.push(this.newMisconception());
    this.misconceptions.push(this.newMisconception());
    this.keywords.clear();
    this.keywords.push(this.newKeyword());
    this.rubric.clear();
    this.rubric.push(this.newRubric());
  }
}
