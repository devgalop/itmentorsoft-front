import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ReportsService } from '@core/reports/reports.service';
import { StudentSummary } from '@core/reports/reports.types';

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
      const summary = await this.reports.getStudentSummary(id);
      this.summary.set(summary);
      if (!summary) {
        this.loadError.set('No hay reporte disponible para este estudiante.');
      }
    } catch (error) {
      this.loadError.set(error instanceof Error ? error.message : 'Error al cargar el reporte');
    } finally {
      this.isLoading.set(false);
    }
  }

  /** Score (0–1) a porcentaje 0–100 para las barras. */
  scorePct(score: number): number {
    const pct = Math.round(score * 100);
    return Math.max(0, Math.min(100, pct));
  }
}
