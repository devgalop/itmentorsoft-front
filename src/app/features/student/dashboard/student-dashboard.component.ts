import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '@core/auth/auth.service';
import { StudentAssessmentService } from '@core/assessments/student-assessment.service';
import { AssessmentSummary } from '@core/assessments/student-assessment.types';
import { ReportsService } from '@core/reports/reports.service';
import { StudentProgress, StudentSummary } from '@core/reports/reports.types';
import { UsersService } from '@core/users/users.service';
import { LEVEL_COLORS } from '@shared/charts/chart-colors';
import { ScoreBarsComponent, ScoreItem } from '@shared/charts/score-bars.component';
import { buildProfileItems, buildTopicSeries, scoreToPct } from '@shared/charts/topic-progress';
import { LevelMedalComponent } from './level-medal.component';

interface LevelMedal {
  name: string;
  color: string;
  /** 0 (principiante) a 3 (avanzado): cada nivel suma un detalle a la medalla del anterior. */
  rank: number;
}

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

const LEVELS = ['principiante', 'básico', 'intermedio', 'avanzado'] as const;

/** Cuántas evaluaciones recientes dibuja la mini gráfica. */
const SPARK_POINTS = 6;
const SPARK_W = 120;
const SPARK_H = 36;

/** Minúsculas y sin tildes, para comparar la categoría que manda el backend. */
function normalizeLevel(value: string): string {
  return value.trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
}

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

  /** La medalla del nivel actual (null si todavía no tiene categoría). */
  readonly medal = computed<LevelMedal | null>(() => {
    const current = normalizeLevel(this.classification() ?? '');
    const index = LEVELS.findIndex((l) => normalizeLevel(l) === current);
    if (index < 0) return null;
    const level = LEVELS[index]!;
    return {
      name: level.charAt(0).toUpperCase() + level.slice(1),
      color: LEVEL_COLORS[level]!,
      rank: index,
    };
  });

  /** true cuando ya se sabe si el estudiante tiene al menos una evaluación. */
  private readonly statusLoaded = signal(false);

  /** El botón de iniciar evaluación solo aparece mientras no haya ninguna evaluación. */
  readonly showStart = computed(
    () => this.statusLoaded() && (this.assessmentsCount() ?? 0) === 0 && this.classification() === null,
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
    const recent = scores.slice(-SPARK_POINTS);
    const coords = recent.map((value, i) => ({
      x: 4 + (i * (SPARK_W - 8)) / Math.max(1, recent.length - 1),
      y: SPARK_H - 4 - (value / 100) * (SPARK_H - 8),
    }));
    return {
      id: latest.assessment_id,
      score: scores[scores.length - 1]!,
      date: latest.date_taken,
      classification: latest.classification,
      delta: scores.length > 1 ? scores[scores.length - 1]! - scores[scores.length - 2]! : null,
      spark: coords.length > 1 ? coords.map((c) => `${c.x.toFixed(1)},${c.y.toFixed(1)}`).join(' ') : null,
      lastDot: coords.length > 1 ? coords[coords.length - 1]! : null,
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

  constructor() {
    const id = this.authService.userId();
    if (id) {
      void this.loadDisplayName(id);
      void this.loadSummary(id);
      void this.loadHistory(id);
      void Promise.all([this.loadAssessmentsCount(id), this.loadProgress(id)]).then(() =>
        this.statusLoaded.set(true),
      );
    } else {
      this.statusLoaded.set(true);
    }
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
