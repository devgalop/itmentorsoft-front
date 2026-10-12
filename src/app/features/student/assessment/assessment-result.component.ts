import { ChangeDetectionStrategy, Component, computed, input, output, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { scoreColor } from '@shared/charts/chart-colors';
import { levelMedal } from '@shared/charts/level-medal';
import { LevelMedalComponent } from '@shared/charts/level-medal.component';
import { scoreToPct } from '@shared/charts/topic-progress';
import { StudentAssessmentResult } from '@core/assessments/student-assessment.types';

/** Por debajo de este puntaje (0–100) una respuesta se marca "por reforzar". */
const WEAK_BELOW = 50;
/** Circunferencia del aro del puntaje (radio 46). */
const RING_LENGTH = 2 * Math.PI * 46;

interface AnswerView {
  number: number;
  question: string;
  answer: string;
  feedback: string;
  score: number;
  color: string;
  keyConcepts: string[];
  misconceptions: string[];
}

/** Resultado de una evaluación: puntaje, nivel, resumen y detalle por pregunta. */
@Component({
  selector: 'app-assessment-result',
  standalone: true,
  imports: [RouterLink, LevelMedalComponent],
  templateUrl: './assessment-result.component.html',
  styleUrl: './assessment-result.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AssessmentResultComponent {
  readonly result = input.required<StudentAssessmentResult>();
  readonly back = output<void>();
  readonly again = output<void>();

  readonly score = computed(() => scoreToPct(this.result().avg_score));
  readonly scoreColor = computed(() => scoreColor(this.score()));
  /** Cuánto del aro se pinta: proporcional al puntaje. */
  readonly ringDash = computed(() => `${(this.score() / 100) * RING_LENGTH} ${RING_LENGTH}`);
  readonly ringLength = RING_LENGTH;

  readonly medal = computed(() => levelMedal(this.result().classification));

  readonly answers = computed<AnswerView[]>(() =>
    this.result().answer_scores.map((a, i) => {
      const score = scoreToPct(a.score);
      return {
        number: i + 1,
        question: a.question_text,
        answer: a.answer,
        feedback: a.feedback,
        score,
        color: scoreColor(score),
        keyConcepts: a.key_concepts ?? [],
        misconceptions: a.misconceptions ?? [],
      };
    }),
  );

  /** Números de las preguntas desplegadas (todas empiezan plegadas para que la pantalla sea corta). */
  readonly openNumbers = signal<ReadonlySet<number>>(new Set());
  readonly allOpen = computed(() => this.answers().length > 0 && this.openNumbers().size === this.answers().length);

  isOpen(number: number): boolean {
    return this.openNumbers().has(number);
  }

  toggle(number: number): void {
    this.openNumbers.update((open) => {
      const next = new Set(open);
      if (!next.delete(number)) next.add(number);
      return next;
    });
  }

  /** Despliega todas las preguntas, o las pliega si ya estaban todas abiertas. */
  toggleAll(): void {
    this.openNumbers.set(this.allOpen() ? new Set() : new Set(this.answers().map((a) => a.number)));
  }

  /** Resumen rápido: cuántas preguntas hubo, la mejor respuesta y cuántas hay por reforzar. */
  readonly summary = computed(() => {
    const scores = this.answers().map((a) => a.score);
    return {
      total: scores.length,
      best: scores.length > 0 ? Math.max(...scores) : null,
      toReinforce: scores.filter((s) => s < WEAK_BELOW).length,
    };
  });
}
