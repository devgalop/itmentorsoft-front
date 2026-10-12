import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ReportsService } from '@core/reports/reports.service';
import { StudentProgress, StudentSummary } from '@core/reports/reports.types';
import { StudentAssessmentService } from '@core/assessments/student-assessment.service';
import { CATEGORY_PALETTE, FALLBACK_COLOR } from '@shared/charts/chart-colors';
import { LineSeries, MultiLineChartComponent, SeriesPoint } from '@shared/charts/multi-line-chart.component';
import { ScoreBarsComponent, ScoreItem } from '@shared/charts/score-bars.component';

@Component({
  selector: 'app-student-detail',
  standalone: true,
  imports: [RouterLink, MultiLineChartComponent, ScoreBarsComponent],
  templateUrl: './student-detail.component.html',
  styleUrl: './student-detail.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StudentDetailComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly reports = inject(ReportsService);
  private readonly studentAssessment = inject(StudentAssessmentService);

  readonly summary = signal<StudentSummary | null>(null);
  readonly progress = signal<StudentProgress | null>(null);
  /** Cantidad de evaluaciones realizadas. null cuando aún no cargó o falló (no es un dato crítico del reporte). */
  readonly assessmentsCount = signal<number | null>(null);
  readonly isLoading = signal(true);
  readonly loadError = signal<string | null>(null);

  constructor() {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      void this.load(id);
    } else {
      this.isLoading.set(false);
      this.loadError.set('Falta el identificador del estudiante.');
    }
  }

  async load(id: string): Promise<void> {
    this.isLoading.set(true);
    this.loadError.set(null);
    try {
      const [summary, progress, assessmentsCount] = await Promise.all([
        this.reports.getStudentSummary(id),
        this.reports.getStudentProgress(id).catch(() => null),
        this.studentAssessment.getQuantity(id).catch(() => null),
      ]);
      this.summary.set(summary);
      this.progress.set(progress);
      this.assessmentsCount.set(assessmentsCount);
      if (!summary) {
        this.loadError.set('No hay reporte disponible para este estudiante.');
      }
    } catch (error) {
      this.loadError.set(error instanceof Error ? error.message : 'Error al cargar el reporte');
    } finally {
      this.isLoading.set(false);
    }
  }

  /**
   * Una serie por tema: el backend manda varios puntos por tema, uno por evaluación, y el
   * `index` dice cuál es (0 = la primera). El puntaje ya viene de 0 a 100.
   */
  readonly progressSeries = computed<LineSeries[]>(() => {
    const byTopic = new Map<string, SeriesPoint[]>();
    for (const item of this.progress()?.knowledge_profile ?? []) {
      const points = byTopic.get(item.topic) ?? [];
      points.push({ x: item.index, value: this.clampPct(item.score) });
      byTopic.set(item.topic, points);
    }
    return [...byTopic].map(([topic, points], i) => ({
      key: topic,
      label: topic,
      color: CATEGORY_PALETTE[i] ?? FALLBACK_COLOR,
      points: points.sort((p, q) => p.x - q.x),
    }));
  });

  /**
   * Perfil de conocimiento actual: un puntaje (0–100) por tema. Cada tema lleva el mismo color
   * que su línea en "Progreso por tema" (si ya se conoce).
   */
  readonly profileItems = computed<ScoreItem[]>(() => {
    const colors = new Map(this.progressSeries().map((s) => [s.key, s.color]));
    return (this.summary()?.profile ?? []).map((p) => ({
      key: p.topic,
      label: p.topic,
      value: this.scorePct(p.score),
      color: colors.get(p.topic),
    }));
  });

  /** Puntaje a 0–100 con un decimal. */
  private clampPct(value: number): number {
    return Math.max(0, Math.min(100, Math.round(value * 10) / 10));
  }

  /** Score (0–1) a porcentaje 0–100 para las barras. */
  scorePct(score: number): number {
    const pct = Math.round(score * 100);
    return Math.max(0, Math.min(100, pct));
  }

  /** El backend devuelve un placeholder en inglés cuando aún no hay clasificación. */
  private isPlaceholder(value: string | null | undefined): boolean {
    if (!value) return true;
    const v = value.toLowerCase();
    return (
      v.includes('will be determined') ||
      v.includes('will be generated') ||
      v.includes("based on the student")
    );
  }

  classificationLabel(value: string | null | undefined): string {
    return this.isPlaceholder(value) ? 'Sin clasificación aún' : (value as string);
  }

  /** Devuelve el feedback real, o null si es el placeholder en inglés (para mostrar el estado vacío). */
  feedbackText(value: string | null | undefined): string | null {
    return this.isPlaceholder(value) ? null : (value as string);
  }
}
