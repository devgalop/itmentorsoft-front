import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ReportsService } from '@core/reports/reports.service';
import { StudentProgress, StudentSummary } from '@core/reports/reports.types';

@Component({
  selector: 'app-student-detail',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './student-detail.component.html',
  styleUrl: './student-detail.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StudentDetailComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly reports = inject(ReportsService);

  readonly summary = signal<StudentSummary | null>(null);
  readonly progress = signal<StudentProgress | null>(null);
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
      const [summary, progress] = await Promise.all([
        this.reports.getStudentSummary(id),
        this.reports.getStudentProgress(id).catch(() => null),
      ]);
      this.summary.set(summary);
      this.progress.set(progress);
      if (!summary) {
        this.loadError.set('No hay reporte disponible para este estudiante.');
      }
    } catch (error) {
      this.loadError.set(error instanceof Error ? error.message : 'Error al cargar el reporte');
    } finally {
      this.isLoading.set(false);
    }
  }

  /** Temas del progreso ordenados por índice (score ya viene en % 0–100). */
  progressTopics(): { topic: string; score: number }[] {
    const items = this.progress()?.knowledge_profile ?? [];
    return [...items]
      .sort((a, b) => a.index - b.index)
      .map((i) => ({ topic: i.topic, score: this.clampPct(i.score) }));
  }

  private clampPct(value: number): number {
    return Math.max(0, Math.min(100, Math.round(value)));
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
