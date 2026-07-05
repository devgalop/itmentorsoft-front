import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { AssessmentsService } from '@core/assessments/assessments.service';
import {
  EvaluativeQuestion,
  QUESTION_CATEGORIES,
  QUESTION_DIFFICULTIES,
  QuestionDetail,
} from '@core/assessments/assessments.types';

type FilterMode = 'level' | 'category';

@Component({
  selector: 'app-question-bank',
  standalone: true,
  templateUrl: './question-bank.component.html',
  styleUrl: './question-bank.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class QuestionBankComponent {
  private readonly assessments = inject(AssessmentsService);

  readonly difficulties = QUESTION_DIFFICULTIES;
  readonly categories = QUESTION_CATEGORIES;

  readonly mode = signal<FilterMode>('level');
  readonly selectedValue = signal<string>(QUESTION_DIFFICULTIES[0]);

  readonly questions = signal<EvaluativeQuestion[]>([]);
  readonly isLoadingList = signal(false);
  readonly listError = signal<string | null>(null);
  readonly hasSearched = signal(false);

  readonly selectedId = signal<string | null>(null);
  readonly detail = signal<QuestionDetail | null>(null);
  readonly isLoadingDetail = signal(false);
  readonly detailError = signal<string | null>(null);

  setMode(mode: FilterMode): void {
    if (this.mode() === mode) {
      return;
    }
    this.mode.set(mode);
    this.selectedValue.set(mode === 'level' ? this.difficulties[0] : this.categories[0]);
  }

  onValueChange(value: string): void {
    this.selectedValue.set(value);
  }

  async search(): Promise<void> {
    this.listError.set(null);
    this.detail.set(null);
    this.selectedId.set(null);
    this.isLoadingList.set(true);
    this.hasSearched.set(true);

    try {
      const value = this.selectedValue();
      const result =
        this.mode() === 'level'
          ? await this.assessments.getQuestionsByLevel(value)
          : await this.assessments.getQuestionsByCategory(value);
      this.questions.set(result);
    } catch (error) {
      this.questions.set([]);
      this.listError.set(error instanceof Error ? error.message : 'Error inesperado');
    } finally {
      this.isLoadingList.set(false);
    }
  }

  async selectQuestion(id: string): Promise<void> {
    if (this.selectedId() === id) {
      return;
    }
    this.selectedId.set(id);
    this.detail.set(null);
    this.detailError.set(null);
    this.isLoadingDetail.set(true);

    try {
      const detail = await this.assessments.getQuestionById(id);
      this.detail.set(detail);
      if (!detail) {
        this.detailError.set('No se encontró el detalle de la pregunta');
      }
    } catch (error) {
      this.detailError.set(error instanceof Error ? error.message : 'Error inesperado');
    } finally {
      this.isLoadingDetail.set(false);
    }
  }
}
