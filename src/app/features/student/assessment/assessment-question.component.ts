import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { TopicQuestion } from '@core/assessments/student-assessment.types';

/** Una pregunta de la lista lateral. */
export interface QuestionItem {
  number: number;
  text: string;
  current: boolean;
  answered: boolean;
}

/** Evento de portapapeles en la caja de respuesta (copiar, pegar, cortar o arrastrar). */
export interface ClipboardAttempt {
  event: Event;
  action: string;
}

/**
 * Pantalla para responder una pregunta: tema, avance de la evaluación, la pregunta destacada,
 * la caja de respuesta con su contador, la lista de preguntas y los botones de navegación.
 * Solo muestra y avisa: quien la usa decide qué hacer con cada evento.
 */
@Component({
  selector: 'app-assessment-question',
  standalone: true,
  templateUrl: './assessment-question.component.html',
  styleUrl: './assessment-question.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AssessmentQuestionComponent {
  readonly question = input.required<TopicQuestion>();
  /** Posición de la pregunta actual (0 es la primera). */
  readonly index = input.required<number>();
  readonly items = input.required<QuestionItem[]>();
  readonly draft = input('');
  readonly maxLength = input(600);
  readonly clipboardBlocked = input(false);
  readonly busy = input(false);
  readonly isLast = input(false);

  readonly answerChange = output<string>();
  readonly prev = output<void>();
  readonly next = output<void>();
  readonly submitted = output<void>();
  readonly jump = output<number>();
  readonly clipboard = output<ClipboardAttempt>();
  readonly menu = output<Event>();

  readonly total = computed(() => this.items().length);
  readonly answeredCount = computed(() => this.items().filter((i) => i.answered).length);
  readonly unanswered = computed(() => this.total() - this.answeredCount());
  readonly progressPct = computed(() =>
    this.total() === 0 ? 0 : Math.round((this.answeredCount() / this.total()) * 100),
  );
  /** Qué tanto de la respuesta se ha usado del máximo permitido (0–100). */
  readonly usedPct = computed(() =>
    this.maxLength() === 0 ? 0 : Math.min(100, Math.round((this.draft().length / this.maxLength()) * 100)),
  );
  readonly atLimit = computed(() => this.draft().length >= this.maxLength());

  /** Ctrl + Enter (o Cmd + Enter): pasa a la siguiente pregunta o envía si es la última. */
  onKeydown(event: KeyboardEvent): void {
    if (!(event.ctrlKey || event.metaKey) || event.key !== 'Enter') return;
    event.preventDefault();
    if (this.busy()) return;
    if (this.isLast()) this.submitted.emit();
    else this.next.emit();
  }
}
