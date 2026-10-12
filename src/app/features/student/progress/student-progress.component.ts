import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { AuthService } from '@core/auth/auth.service';
import { ReportsService } from '@core/reports/reports.service';
import { StudentProgress, StudentSummary } from '@core/reports/reports.types';
import { LineSeries, MultiLineChartComponent } from '@shared/charts/multi-line-chart.component';
import { ScoreBarsComponent, ScoreItem } from '@shared/charts/score-bars.component';
import { buildProfileItems, buildTopicSeries, scoreToPct } from '@shared/charts/topic-progress';

@Component({
  selector: 'app-student-progress',
  standalone: true,
  imports: [MultiLineChartComponent, ScoreBarsComponent],
  templateUrl: './student-progress.component.html',
  styleUrl: './student-progress.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StudentProgressComponent {
  private readonly auth = inject(AuthService);
  private readonly reports = inject(ReportsService);

  readonly summary = signal<StudentSummary | null>(null);
  private readonly progress = signal<StudentProgress | null>(null);

  /** Una línea por tema a lo largo de las evaluaciones (la misma gráfica del reporte del docente). */
  readonly progressSeries = computed<LineSeries[]>(() => buildTopicSeries(this.progress()?.knowledge_profile ?? []));

  /** Perfil de conocimiento actual, con el color de cada tema. */
  readonly profileItems = computed<ScoreItem[]>(() =>
    buildProfileItems(this.summary()?.profile ?? [], this.progressSeries()),
  );
  readonly isLoading = signal(true);
  readonly loadError = signal<string | null>(null);

  constructor() {
    const id = this.auth.userId();
    if (id) {
      void this.load(id);
    } else {
      this.isLoading.set(false);
      this.loadError.set('No se pudo identificar tu usuario. Inicia sesión de nuevo.');
    }
  }

  async load(id: string): Promise<void> {
    this.isLoading.set(true);
    this.loadError.set(null);
    try {
      const [summary, progress] = await Promise.all([
        this.reports.getStudentSummary(id),
        // El historial por tema es un extra: si falla, el resto de la pantalla sigue funcionando.
        this.reports.getStudentProgress(id).catch(() => null),
      ]);
      this.summary.set(summary);
      this.progress.set(progress);
      if (!summary) {
        this.loadError.set('Todavía no hay datos de tu progreso. Completa una evaluación para verlo.');
      }
    } catch (error) {
      this.loadError.set(error instanceof Error ? error.message : 'Error al cargar tu progreso');
    } finally {
      this.isLoading.set(false);
    }
  }

  scorePct(score: number): number {
    return scoreToPct(score);
  }

  private isPlaceholder(value: string | null | undefined): boolean {
    if (!value) return true;
    const v = value.toLowerCase();
    return (
      v.includes('will be determined') ||
      v.includes('will be generated') ||
      v.includes('based on the student')
    );
  }

  classificationLabel(value: string | null | undefined): string {
    return this.isPlaceholder(value) ? 'Sin clasificación aún' : (value as string);
  }

  feedbackText(value: string | null | undefined): string | null {
    return this.isPlaceholder(value) ? null : (value as string);
  }
}
