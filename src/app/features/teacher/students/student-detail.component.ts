import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ReportsService } from '@core/reports/reports.service';
import { StudentProgress, StudentSummary } from '@core/reports/reports.types';
import { StudentAssessmentService } from '@core/assessments/student-assessment.service';
import { levelMedal } from '@shared/charts/level-medal';
import { LevelMedalComponent } from '@shared/charts/level-medal.component';
import { LineSeries, MultiLineChartComponent } from '@shared/charts/multi-line-chart.component';
import { ScoreBarsComponent, ScoreItem } from '@shared/charts/score-bars.component';
import { buildProfileItems, buildTopicSeries, scoreToPct } from '@shared/charts/topic-progress';

@Component({
  selector: 'app-student-detail',
  standalone: true,
  imports: [RouterLink, MultiLineChartComponent, ScoreBarsComponent, LevelMedalComponent],
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

  /** Medalla del nivel del estudiante. */
  readonly medal = computed(() => levelMedal(this.summary()?.knowledge_classification));

  /** Una serie por tema, una línea por evaluación (ver `buildTopicSeries`). */
  readonly progressSeries = computed<LineSeries[]>(() => buildTopicSeries(this.progress()?.knowledge_profile ?? []));

  /** Perfil de conocimiento actual, con el color de cada tema. */
  readonly profileItems = computed<ScoreItem[]>(() =>
    buildProfileItems(this.summary()?.profile ?? [], this.progressSeries()),
  );

  /** Score (0–1) a porcentaje 0–100 para las barras. */
  scorePct(score: number): number {
    return scoreToPct(score);
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
