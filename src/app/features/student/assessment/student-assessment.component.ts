import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AuthService } from '@core/auth/auth.service';
import { StudentAssessmentService } from '@core/assessments/student-assessment.service';
import { ToastService } from '@shared/ui/toast/toast.service';
import {
  AssessmentAnswerInput,
  AssessmentSummary,
  StudentAssessmentResult,
  TopicQuestion,
} from '@core/assessments/student-assessment.types';

type Step = 'setup' | 'answering' | 'grading' | 'history' | 'result';

const NUMBER_OF_QUESTIONS = 5;
const POLL_INTERVAL_MS = 3000;
const MAX_POLLS = 40; // ~2 min de espera máxima

@Component({
  selector: 'app-student-assessment',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './student-assessment.component.html',
  styleUrl: './student-assessment.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StudentAssessmentComponent {
  private readonly auth = inject(AuthService);
  private readonly assessments = inject(StudentAssessmentService);
  private readonly toast = inject(ToastService);

  readonly step = signal<Step>('history');
  readonly error = signal<string | null>(null);
  readonly isBusy = signal(false);

  // Setup
  readonly topics = signal<string[]>([]);
  readonly selectedTopic = signal<string>('');
  readonly isLoadingTopics = signal(false);

  // Answering
  readonly questions = signal<TopicQuestion[]>([]);
  readonly currentIndex = signal(0);
  private assessmentId: string | null = null;
  private readonly answers = new Map<string, string>();
  private questionStartedAt = Date.now();
  private readonly timePerQuestion = new Map<string, number>();
  /** Texto de la respuesta visible; se sincroniza por pregunta (arregla el bug visual). */
  readonly draft = signal('');

  // History (historial de evaluaciones)
  readonly history = signal<AssessmentSummary[]>([]);
  readonly isLoadingHistory = signal(false);

  // Result
  readonly result = signal<StudentAssessmentResult | null>(null);
  readonly gradingMessage = signal('Estamos calificando tus respuestas…');

  readonly currentQuestion = computed<TopicQuestion | null>(
    () => this.questions()[this.currentIndex()] ?? null,
  );
  readonly progressLabel = computed(
    () => `Pregunta ${this.currentIndex() + 1} de ${this.questions().length}`,
  );
  readonly isLastQuestion = computed(
    () => this.currentIndex() >= this.questions().length - 1,
  );

  constructor() {
    // Arranca mostrando el historial; los temas se precargan para "Nueva evaluación".
    void this.loadTopics();
    void this.loadHistory();
  }

  private get userId(): string | null {
    return this.auth.userId();
  }

  async loadTopics(): Promise<void> {
    this.isLoadingTopics.set(true);
    this.error.set(null);
    try {
      const topics = await this.assessments.getTopics();
      this.topics.set(topics);
      if (topics.length > 0) {
        this.selectedTopic.set(topics[0]!);
      }
    } catch (error) {
      this.error.set(error instanceof Error ? error.message : 'Error al cargar los temas');
    } finally {
      this.isLoadingTopics.set(false);
    }
  }

  async startAssessment(): Promise<void> {
    const userId = this.userId;
    if (!userId) {
      this.error.set('No se pudo identificar tu usuario. Iniciá sesión de nuevo.');
      return;
    }
    if (!this.selectedTopic()) {
      this.error.set('Elegí un tema para comenzar.');
      return;
    }

    this.error.set(null);
    this.isBusy.set(true);
    try {
      const generated = await this.assessments.generateByTopic(
        this.selectedTopic(),
        userId,
        NUMBER_OF_QUESTIONS,
      );
      if (generated.questions.length === 0) {
        this.error.set('No hay preguntas disponibles para este tema.');
        return;
      }
      this.assessmentId = generated.assessmentId;
      this.questions.set(generated.questions);
      this.currentIndex.set(0);
      this.answers.clear();
      this.timePerQuestion.clear();
      this.draft.set('');
      this.questionStartedAt = Date.now();
      this.step.set('answering');
    } catch (error) {
      this.error.set(error instanceof Error ? error.message : 'No se pudo iniciar la evaluación');
    } finally {
      this.isBusy.set(false);
    }
  }

  onAnswerChange(value: string): void {
    const q = this.currentQuestion();
    if (q) {
      this.answers.set(q.question_id, value);
    }
    this.draft.set(value);
  }

  /** Carga en el textarea la respuesta guardada de la pregunta actual. */
  private syncDraft(): void {
    const q = this.currentQuestion();
    this.draft.set(q ? (this.answers.get(q.question_id) ?? '') : '');
  }

  /** Bloquea copiar/pegar/cortar/arrastrar en el campo de respuesta y avisa. */
  blockClipboard(event: Event, action: string): void {
    event.preventDefault();
    this.toast.warning(
      'Acción no permitida',
      `No se puede ${action} en la evaluación. Escribí tu respuesta con tus palabras.`,
    );
  }

  /** Evita el menú contextual (que ofrece pegar) en el campo de respuesta. */
  blockContextMenu(event: Event): void {
    event.preventDefault();
  }

  private recordTime(): void {
    const q = this.currentQuestion();
    if (!q) return;
    const elapsed = Math.max(0, Math.round((Date.now() - this.questionStartedAt) / 1000));
    this.timePerQuestion.set(q.question_id, (this.timePerQuestion.get(q.question_id) ?? 0) + elapsed);
    this.questionStartedAt = Date.now();
  }

  next(): void {
    this.recordTime();
    if (!this.isLastQuestion()) {
      this.currentIndex.update((i) => i + 1);
      this.syncDraft();
    }
  }

  prev(): void {
    this.recordTime();
    if (this.currentIndex() > 0) {
      this.currentIndex.update((i) => i - 1);
      this.syncDraft();
    }
  }

  /** ¿Todas las preguntas respondidas (no vacías)? */
  readonly allAnswered = computed(() => {
    // depende de questions() y se recomputa al escribir porque currentAnswer cambia el Map,
    // pero el Map no es reactivo: se valida al momento de enviar igualmente.
    return this.questions().every((q) => (this.answers.get(q.question_id) ?? '').trim().length > 0);
  });

  async submit(): Promise<void> {
    this.recordTime();
    const userId = this.userId;
    if (!userId || !this.assessmentId) {
      this.error.set('No se pudo enviar la evaluación. Iniciá sesión de nuevo.');
      return;
    }

    const missing = this.questions().filter(
      (q) => (this.answers.get(q.question_id) ?? '').trim().length === 0,
    );
    if (missing.length > 0) {
      this.error.set(`Te faltan ${missing.length} respuesta(s) por completar.`);
      return;
    }

    this.error.set(null);
    this.isBusy.set(true);

    const answers: AssessmentAnswerInput[] = this.questions().map((q) => ({
      question_id: q.question_id,
      answer: (this.answers.get(q.question_id) ?? '').trim(),
      takes_time_seconds: this.timePerQuestion.get(q.question_id) ?? 0,
    }));

    try {
      const saved = await this.assessments.saveAnswers({
        assessment_id: this.assessmentId,
        user_id: userId,
        answers,
      });
      if (!saved.is_success) {
        this.error.set(saved.message || 'No se pudieron guardar las respuestas');
        return;
      }
      this.step.set('grading');
      await this.waitForQualificationAndLoadResult(userId, this.assessmentId);
    } catch (error) {
      this.error.set(error instanceof Error ? error.message : 'Error al enviar la evaluación');
      this.step.set('answering');
    } finally {
      this.isBusy.set(false);
    }
  }

  /** Polling del estado de calificación; al terminar, muestra el historial. */
  private async waitForQualificationAndLoadResult(
    userId: string,
    assessmentId: string,
  ): Promise<void> {
    for (let attempt = 0; attempt < MAX_POLLS; attempt++) {
      try {
        const ready = await this.assessments.getQualificationStatus(userId, assessmentId);
        if (ready) {
          await this.loadHistory();
          this.step.set('history');
          return;
        }
      } catch {
        // Reintenta silenciosamente durante el polling.
      }
      await this.delay(POLL_INTERVAL_MS);
    }
    this.gradingMessage.set(
      'La calificación está tardando más de lo esperado. Podés revisar el resultado más tarde.',
    );
  }

  /** Carga el historial de evaluaciones del estudiante (punto 4). */
  async loadHistory(): Promise<void> {
    const userId = this.userId;
    if (!userId) return;
    this.isLoadingHistory.set(true);
    try {
      const list = await this.assessments.getAssessmentsSummary(userId);
      this.history.set(list);
    } catch {
      // Si falla el historial no bloqueamos la pantalla; queda vacío.
      this.history.set([]);
    } finally {
      this.isLoadingHistory.set(false);
    }
  }

  /** Abre el historial desde el setup. */
  async openHistory(): Promise<void> {
    this.error.set(null);
    await this.loadHistory();
    this.step.set('history');
  }

  /** Al clickear una evaluación del historial, carga y muestra su detalle (punto 8). */
  async viewResult(assessmentId: string): Promise<void> {
    const userId = this.userId;
    if (!userId) return;
    this.isBusy.set(true);
    this.error.set(null);
    try {
      const result = await this.assessments.getResult(userId, assessmentId);
      if (!result) {
        this.toast.warning('Sin detalle', 'No se encontró el detalle de esta evaluación.');
        return;
      }
      this.result.set(result);
      this.step.set('result');
    } catch (error) {
      this.toast.error(
        'No se pudo cargar el resultado',
        error instanceof Error ? error.message : 'Error inesperado',
      );
    } finally {
      this.isBusy.set(false);
    }
  }

  /** Vuelve del detalle al historial. */
  backToHistory(): void {
    this.result.set(null);
    this.step.set('history');
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  scorePct(score: number): number {
    const pct = Math.round(score * 100);
    return Math.max(0, Math.min(100, pct));
  }

  restart(): void {
    this.step.set('setup');
    this.error.set(null);
    this.result.set(null);
    this.assessmentId = null;
    this.questions.set([]);
    this.answers.clear();
    this.timePerQuestion.clear();
    this.currentIndex.set(0);
    this.draft.set('');
    this.gradingMessage.set('Estamos calificando tus respuestas…');
  }

  /** Fecha legible para el historial. */
  formatDate(value: string): string {
    const d = new Date(value);
    return isNaN(d.getTime()) ? value : d.toLocaleDateString();
  }
}
