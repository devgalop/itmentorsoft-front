import { ChangeDetectionStrategy, Component, computed, effect, inject, signal, untracked } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '@core/auth/auth.service';
import { GradingWatcherService } from '@core/assessments/grading-watcher.service';
import { StudentAssessmentService } from '@core/assessments/student-assessment.service';
import { ContentService } from '@core/content/content.service';
import { RecommendedContent, RecommendedTopic } from '@core/content/content.types';
import { AssessmentSummary } from '@core/assessments/student-assessment.types';
import { ReportsService } from '@core/reports/reports.service';
import { StudentProgress, StudentSummary } from '@core/reports/reports.types';
import { UsersService } from '@core/users/users.service';
import { ScoreBarsComponent, ScoreItem } from '@shared/charts/score-bars.component';
import { ToastService } from '@shared/ui/toast/toast.service';
import { buildSparkline } from '@shared/charts/sparkline';
import { buildProfileItems, buildTopicSeries, scoreToPct } from '@shared/charts/topic-progress';
import { LevelMedal, levelMedal } from '@shared/charts/level-medal';
import { LevelMedalComponent } from '@shared/charts/level-medal.component';

/** Resumen de la evaluación más reciente. */
interface LastEvaluation {
  id: string;
  /** Puntaje 0–100. */
  score: number;
  date: string;
  classification: string | null;
  /** Diferencia en puntos frente a la evaluación anterior (null si es la primera). */
  delta: number | null;
  /** Puntos de la mini gráfica (las últimas evaluaciones, de la más antigua a la más reciente). */
  spark: string | null;
  lastDot: { x: number; y: number } | null;
}

/** Cuántas evaluaciones recientes dibuja la mini gráfica. */
const SPARK_POINTS = 6;
const SPARK_W = 120;
const SPARK_H = 36;

/** El backend devuelve un texto en inglés de relleno cuando todavía no hay feedback. */
function realFeedback(value: string | null | undefined): string | null {
  if (!value) return null;
  const v = value.toLowerCase();
  const placeholder =
    v.includes('will be determined') || v.includes('will be generated') || v.includes('based on the student');
  return placeholder ? null : value;
}

@Component({
  selector: 'app-student-dashboard',
  standalone: true,
  imports: [RouterLink, ScoreBarsComponent, LevelMedalComponent],
  templateUrl: './student-dashboard.component.html',
  styleUrl: './student-dashboard.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StudentDashboardComponent {
  private readonly authService = inject(AuthService);
  private readonly studentAssessment = inject(StudentAssessmentService);
  private readonly reports = inject(ReportsService);
  private readonly usersService = inject(UsersService);
  private readonly grading = inject(GradingWatcherService);
  private readonly content = inject(ContentService);
  private readonly toast = inject(ToastService);

  /** Nombre real del estudiante (se carga del backend). */
  private readonly displayName = signal<string | null>(null);
  /** Lo que se muestra en el saludo: el nombre, o el username si aún no llegó. */
  readonly userName = computed(
    () => this.displayName() ?? this.authService.user()?.userName ?? 'Estudiante',
  );

  /** Cantidad de evaluaciones realizadas. null mientras carga o si falla (se muestra '0'). */
  private readonly assessmentsCount = signal<number | null>(null);
  readonly evaluationsTotal = computed(() => this.assessmentsCount() ?? 0);

  /** Categoría (clasificación) asignada por el modelo ML. null si no hay evaluación aún o falla la carga. */
  readonly classification = signal<string | null>(null);

  private readonly progress = signal<StudentProgress | null>(null);
  private readonly summary = signal<StudentSummary | null>(null);
  private readonly history = signal<AssessmentSummary[]>([]);
  /** Rutas del estudiante (de la más reciente a la más antigua). */
  private readonly route = signal<RecommendedTopic[]>([]);
  /** content_id del recurso que se está abriendo. */
  readonly openingId = signal<string | null>(null);

  /** La medalla del nivel actual (null si todavía no tiene categoría). */
  readonly medal = computed<LevelMedal | null>(() => levelMedal(this.classification()));

  /** true cuando ya se sabe si el estudiante tiene al menos una evaluación. */
  private readonly statusLoaded = signal(false);

  /** ¿Hay una evaluación enviada que todavía se está calificando? */
  readonly gradingPending = computed(() => this.grading.hasPending(this.authService.userId()));

  /** El botón de iniciar evaluación solo aparece mientras no haya ninguna evaluación. */
  readonly showStart = computed(
    () =>
      this.statusLoaded() &&
      !this.gradingPending() &&
      (this.assessmentsCount() ?? 0) === 0 &&
      this.classification() === null,
  );

  /** Perfil de conocimiento actual, con el color de cada tema (el de su línea en Mi progreso). */
  readonly profileItems = computed<ScoreItem[]>(() =>
    buildProfileItems(
      this.summary()?.profile ?? [],
      buildTopicSeries(this.progress()?.knowledge_profile ?? []),
    ),
  );

  /** Tema con el puntaje más bajo; solo se sugiere si hay varios temas con puntajes distintos. */
  readonly weakest = computed<ScoreItem | null>(() => {
    const items = this.profileItems();
    if (items.length < 2) return null;
    const sorted = [...items].sort((a, b) => a.value - b.value);
    return sorted[0]!.value === sorted[sorted.length - 1]!.value ? null : sorted[0]!;
  });

  /** Tema con el puntaje más alto (misma regla que `weakest`). */
  readonly strongest = computed<ScoreItem | null>(() => {
    const items = this.profileItems();
    if (items.length < 2) return null;
    const sorted = [...items].sort((a, b) => b.value - a.value);
    return sorted[0]!.value === sorted[sorted.length - 1]!.value ? null : sorted[0]!;
  });

  /**
   * Hasta dos recursos de la ruta para el tema más débil que todavía no se han visto, para que el
   * estudiante sepa por dónde empezar.
   */
  readonly weakResources = computed<RecommendedContent[]>(() => {
    const weak = this.weakest();
    if (!weak) return [];
    const same = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();
    const topic = this.route().find((t) => same(t.topic, weak.label));
    return (topic?.contents ?? []).filter((c) => !c.is_completed).slice(0, 2);
  });

  /** Feedback personalizado, sin el texto de relleno del backend. */
  readonly feedback = computed(() => realFeedback(this.summary()?.feedback));

  /** Evaluación más reciente, con su variación y una mini gráfica de las últimas. */
  readonly last = computed<LastEvaluation | null>(() => {
    const sorted = [...this.history()]
      .filter((h) => !isNaN(new Date(h.date_taken).getTime()))
      .sort((a, b) => new Date(a.date_taken).getTime() - new Date(b.date_taken).getTime());
    if (sorted.length === 0) return null;
    const scores = sorted.map((h) => scoreToPct(h.score));
    const latest = sorted[sorted.length - 1]!;
    const spark = buildSparkline(scores.slice(-SPARK_POINTS), SPARK_W, SPARK_H);
    return {
      id: latest.assessment_id,
      score: scores[scores.length - 1]!,
      date: latest.date_taken,
      classification: latest.classification,
      delta: scores.length > 1 ? scores[scores.length - 1]! - scores[scores.length - 2]! : null,
      spark: spark?.points ?? null,
      lastDot: spark?.last ?? null,
    };
  });

  /** Enlace de la tarjeta "Última evaluación": directo a su resultado (o al historial si no hay). */
  readonly lastParams = computed(() => {
    const l = this.last();
    return l ? { result: l.id } : {};
  });

  /** Enlaces para empezar una evaluación: abren directo la elección del tema. */
  readonly newParams = { new: 1 };

  readonly sparkSize = { w: SPARK_W, h: SPARK_H };

  /** Calificaciones terminadas que esta pantalla ya conoce (para refrescar solo cuando llega una nueva). */
  private seenCompleted = this.grading.completedCount();

  constructor() {
    const id = this.authService.userId();
    if (id) {
      void this.loadDisplayName(id);
      this.loadData(id);
    } else {
      this.statusLoaded.set(true);
    }

    // Cuando termina una calificación, se recargan los datos: aparece el nivel, la medalla y el perfil.
    effect(() => {
      const completed = this.grading.completedCount();
      untracked(() => {
        const userId = this.authService.userId();
        if (completed === this.seenCompleted || !userId) return;
        this.seenCompleted = completed;
        this.loadData(userId);
      });
    });
  }

  private loadData(id: string): void {
    void this.loadSummary(id);
    void this.loadHistory(id);
    void this.loadRoute(id);
    void Promise.all([this.loadAssessmentsCount(id), this.loadProgress(id)]).then(() =>
      this.statusLoaded.set(true),
    );
  }

  formatDate(value: string): string {
    const d = new Date(value);
    return isNaN(d.getTime()) ? value : d.toLocaleDateString();
  }

  /**
   * El JWT solo trae el usuario (username); el nombre real se pide al backend. Mientras
   * llega, o si falla, el saludo usa el username.
   */
  private async loadDisplayName(userId: string): Promise<void> {
    try {
      const user = await this.usersService.getUser(userId);
      const name = user?.name?.trim();
      if (name) this.displayName.set(name);
    } catch {
      // Sin nombre: se queda con el username.
    }
  }

  private async loadAssessmentsCount(userId: string): Promise<void> {
    try {
      this.assessmentsCount.set(await this.studentAssessment.getQuantity(userId));
    } catch {
      // Silencioso: se queda en 0.
    }
  }

  /** Categoría y evolución por tema (un estudiante sin evaluación inicial aún no tiene). */
  private async loadProgress(userId: string): Promise<void> {
    try {
      const progress = await this.reports.getStudentProgress(userId);
      this.progress.set(progress);
      this.classification.set(progress?.classification ?? null);
    } catch {
      // Silencioso: sin categoría ni evolución.
    }
  }

  private async loadRoute(userId: string): Promise<void> {
    try {
      this.route.set(await this.content.getCompleteLearningPaths(userId));
    } catch {
      // Silencioso: sin recursos sugeridos.
    }
  }

  /** Abre un recurso de la ruta en una pestaña nueva (la recomendación no trae la URL). */
  async openResource(contentId: string): Promise<void> {
    if (this.openingId()) return;
    this.openingId.set(contentId);
    try {
      const detail = await this.content.getContentById(contentId);
      if (!detail?.url) {
        this.toast.error('No se pudo abrir', 'No encontramos el recurso solicitado.');
        return;
      }
      window.open(detail.url, '_blank', 'noopener');
    } catch (error) {
      this.toast.error('No se pudo abrir el recurso', error instanceof Error ? error.message : 'Error inesperado');
    } finally {
      this.openingId.set(null);
    }
  }

  private async loadSummary(userId: string): Promise<void> {
    try {
      this.summary.set(await this.reports.getStudentSummary(userId));
    } catch {
      // Silencioso: sin perfil ni feedback.
    }
  }

  private async loadHistory(userId: string): Promise<void> {
    try {
      this.history.set(await this.studentAssessment.getAssessmentsSummary(userId));
    } catch {
      // Silencioso: sin última evaluación.
    }
  }
}
