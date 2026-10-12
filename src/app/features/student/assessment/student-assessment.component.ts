import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '@core/auth/auth.service';
import { GradingWatcherService } from '@core/assessments/grading-watcher.service';
import { StudentAssessmentService } from '@core/assessments/student-assessment.service';
import { environment } from '../../../../environments/environment';
import { PagerComponent } from '@shared/ui/pager/pager.component';
import { AssessmentResultComponent } from './assessment-result.component';
import { ToastService } from '@shared/ui/toast/toast.service';
import {
  AssessmentAnswerInput,
  AssessmentSummary,
  StudentAssessmentResult,
  TopicQuestion,
} from '@core/assessments/student-assessment.types';

type Step = 'setup' | 'answering' | 'grading' | 'history' | 'result';

/** El spinner de "Calificando…" dura solo esto; después se avisa que se notificará. */
export const GRADING_SPINNER_MS = 2000;
/** Tiempo que se muestra el aviso antes de llevar al estudiante al principal. */
export const REDIRECT_MS = 2500;

/** Límite del backend por respuesta (save_assessments_answers). */
export const MAX_ANSWER_LENGTH = 600;
/** Evaluaciones por página en el historial. */
export const HISTORY_PAGE_SIZE = 6;

@Component({
  selector: 'app-student-assessment',
  standalone: true,
  imports: [FormsModule, PagerComponent, AssessmentResultComponent],
  templateUrl: './student-assessment.component.html',
  styleUrl: './student-assessment.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StudentAssessmentComponent {
  private readonly auth = inject(AuthService);
  private readonly assessments = inject(StudentAssessmentService);
  private readonly toast = inject(ToastService);
  private readonly route = inject(ActivatedRoute, { optional: true });
  private readonly router = inject(Router);
  private readonly grading = inject(GradingWatcherService);
  private readonly timers = new Set<ReturnType<typeof setTimeout>>();

  private readonly cleanup = inject(DestroyRef).onDestroy(() => this.clearTimers());

  /** Viene del ambiente: si es true se bloquea copiar/pegar en la respuesta. */
  readonly clipboardBlocked = environment.blockClipboardInAnswers;

  readonly maxAnswerLength = MAX_ANSWER_LENGTH;

  readonly step = signal<Step>('history');
  readonly error = signal<string | null>(null);
  readonly isBusy = signal(false);
  /** 'working': spinner de calificando; 'sent': aviso de que se notificará y se irá al principal. */
  readonly gradingPhase = signal<'working' | 'sent'>('working');

  // Setup
  readonly topics = signal<string[]>([]);
  readonly selectedTopic = signal<string>('');
  readonly isLoadingTopics = signal(false);

  // Answering
  readonly questions = signal<TopicQuestion[]>([]);
  readonly currentIndex = signal(0);
  private assessmentId: string | null = null;
  private readonly answers = new Map<string, string>();
  /** El Map no es reactivo: este contador avisa cuando cambia una respuesta. */
  private readonly answersVersion = signal(0);
  private questionStartedAt = Date.now();
  private readonly timePerQuestion = new Map<string, number>();
  /** Texto de la respuesta visible; se sincroniza por pregunta (arregla el bug visual). */
  readonly draft = signal('');

  // History (historial de evaluaciones)
  readonly history = signal<AssessmentSummary[]>([]);
  readonly isLoadingHistory = signal(false);
  readonly historyPage = signal(0);
  readonly historyTotal = signal(0);
  readonly historyTotalPages = computed(() => Math.ceil(this.historyTotal() / HISTORY_PAGE_SIZE));

  // Result
  readonly result = signal<StudentAssessmentResult | null>(null);

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

    // Enlaces del principal: ?new=1 abre directo la elección de tema y ?result=<id> el detalle.
    const params = this.route?.snapshot.queryParamMap;
    const resultId = params?.get('result');
    if (resultId) {
      void this.viewResult(resultId);
    } else if (params?.has('new')) {
      this.restart();
    }
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
      this.error.set('No se pudo identificar tu usuario. Inicia sesión de nuevo.');
      return;
    }
    if (!this.selectedTopic()) {
      this.error.set('Elige un tema para comenzar.');
      return;
    }

    this.error.set(null);
    this.isBusy.set(true);
    try {
      const generated = await this.assessments.generateByTopic(this.selectedTopic(), userId);
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

  onAnswerChange(rawValue: string): void {
    const value = rawValue.slice(0, MAX_ANSWER_LENGTH);
    const q = this.currentQuestion();
    if (q) {
      this.answers.set(q.question_id, value);
      this.answersVersion.update((v) => v + 1);
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
    if (!this.clipboardBlocked) return;
    event.preventDefault();
    this.toast.warning(
      'Acción no permitida',
      `No se puede ${action} en la evaluación. Escribe tu respuesta con tus palabras.`,
    );
  }

  /** Evita el menú contextual (que ofrece pegar) en el campo de respuesta. */
  blockContextMenu(event: Event): void {
    if (!this.clipboardBlocked) return;
    event.preventDefault();
  }

  private recordTime(): void {
    const q = this.currentQuestion();
    if (!q) return;
    const elapsed = Math.max(0, Math.round((Date.now() - this.questionStartedAt) / 1000));
    this.timePerQuestion.set(q.question_id, (this.timePerQuestion.get(q.question_id) ?? 0) + elapsed);
    this.questionStartedAt = Date.now();
  }

  /** Un punto por pregunta: cuál es la actual y cuáles ya tienen respuesta. */
  readonly questionDots = computed(() => {
    this.answersVersion();
    const current = this.currentIndex();
    return this.questions().map((q, i) => ({
      number: i + 1,
      current: i === current,
      answered: (this.answers.get(q.question_id) ?? '').trim().length > 0,
    }));
  });

  /** Cuántas preguntas faltan por responder. */
  readonly unansweredCount = computed(() => this.questionDots().filter((d) => !d.answered).length);

  /** Salta directo a una pregunta (los puntos de arriba). */
  goTo(index: number): void {
    if (index < 0 || index >= this.questions().length || index === this.currentIndex()) return;
    this.recordTime();
    this.currentIndex.set(index);
    this.syncDraft();
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
      this.error.set('No se pudo enviar la evaluación. Inicia sesión de nuevo.');
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
      // La calificación es asíncrona: se espera en segundo plano. Un par de segundos de spinner,
      // luego el aviso de que se notificará, y de ahí al principal.
      this.grading.watch(userId, this.assessmentId);
      this.gradingPhase.set('working');
      this.step.set('grading');
      this.later(() => {
        this.gradingPhase.set('sent');
        this.later(() => void this.goToDashboard(), REDIRECT_MS);
      }, GRADING_SPINNER_MS);
    } catch (error) {
      this.error.set(error instanceof Error ? error.message : 'Error al enviar la evaluación');
      this.step.set('answering');
    } finally {
      this.isBusy.set(false);
    }
  }

  /** Lleva al estudiante al principal (sin esperar al temporizador si pulsó el botón). */
  async goToDashboard(): Promise<void> {
    this.clearTimers();
    // El aviso flotante sigue visible ya sobre el principal.
    this.toast.info(
      'Evaluación enviada',
      'Estamos calificando tus respuestas. Te avisaremos aquí y por correo cuando termine.',
      8000,
    );
    await this.router.navigate(['/student/dashboard']);
  }

  private later(fn: () => void, ms: number): void {
    const id = setTimeout(() => {
      this.timers.delete(id);
      fn();
    }, ms);
    this.timers.add(id);
  }

  private clearTimers(): void {
    this.timers.forEach((id) => clearTimeout(id));
    this.timers.clear();
  }

  /** Carga una página del historial de evaluaciones del estudiante (punto 4). */
  async loadHistory(page = 0): Promise<void> {
    const userId = this.userId;
    if (!userId) return;
    this.isLoadingHistory.set(true);
    try {
      const [list, total] = await Promise.all([
        this.assessments.getAssessmentsSummary(userId, page, HISTORY_PAGE_SIZE),
        // Si el total falla, se deduce de la página: una página llena permite seguir avanzando.
        this.assessments.getQuantity(userId).catch(() => null),
      ]);
      this.history.set(list);
      this.historyPage.set(page);
      this.historyTotal.set(
        total ?? page * HISTORY_PAGE_SIZE + list.length + (list.length === HISTORY_PAGE_SIZE ? 1 : 0),
      );
    } catch {
      // Si falla el historial no bloqueamos la pantalla; queda vacío.
      this.history.set([]);
      this.historyTotal.set(0);
    } finally {
      this.isLoadingHistory.set(false);
    }
  }

  async prevHistoryPage(): Promise<void> {
    if (this.historyPage() > 0) await this.loadHistory(this.historyPage() - 1);
  }

  async nextHistoryPage(): Promise<void> {
    if (this.historyPage() + 1 < this.historyTotalPages()) await this.loadHistory(this.historyPage() + 1);
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
  }

  /** Fecha legible para el historial. */
  formatDate(value: string): string {
    const d = new Date(value);
    return isNaN(d.getTime()) ? value : d.toLocaleDateString();
  }
}
