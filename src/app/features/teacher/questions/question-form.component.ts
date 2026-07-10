import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
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
import { RouterLink } from '@angular/router';
import { AssessmentsService } from '@core/assessments/assessments.service';
import { RegisterQuestionPayload } from '@core/assessments/assessments.types';

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

  readonly isSubmitting = signal(false);
  readonly submitError = signal<string | null>(null);
  readonly submitSuccess = signal<string | null>(null);

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

  get misconceptions(): FormArray {
    return this.form.get('common_misconception') as FormArray;
  }

  get keywords(): FormArray {
    return this.form.get('semantic_keywords') as FormArray;
  }

  get rubric(): FormArray {
    return this.form.get('rubric') as FormArray;
  }

  private newMisconception(): FormControl {
    return this.fb.nonNullable.control('', [
      Validators.required,
      Validators.minLength(20),
      Validators.maxLength(300),
    ]);
  }

  private newKeyword(): FormControl {
    return this.fb.nonNullable.control('', [
      Validators.required,
      Validators.minLength(2),
      Validators.maxLength(100),
    ]);
  }

  private newRubric(): FormGroup {
    return this.fb.nonNullable.group({
      score: [0, [Validators.required, Validators.min(0), Validators.max(3)]],
      criteria: ['', [Validators.required, Validators.minLength(10), Validators.maxLength(300)]],
    });
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
    this.submitError.set(null);
    this.submitSuccess.set(null);

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.isSubmitting.set(true);
    const payload = this.form.getRawValue() as RegisterQuestionPayload;

    try {
      const response = await this.assessments.registerQuestion(payload);
      if (response.is_success) {
        this.submitSuccess.set(response.message || 'Pregunta creada correctamente');
        this.resetForm();
      } else {
        this.submitError.set(response.message || 'No se pudo crear la pregunta');
      }
    } catch (error) {
      this.submitError.set(error instanceof Error ? error.message : 'Error inesperado');
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
