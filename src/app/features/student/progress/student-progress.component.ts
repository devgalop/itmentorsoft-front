import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { AuthService } from '@core/auth/auth.service';
import { ReportsService } from '@core/reports/reports.service';
import { StudentSummary } from '@core/reports/reports.types';

@Component({
  selector: 'app-student-progress',
  standalone: true,
  templateUrl: './student-progress.component.html',
  styleUrl: './student-progress.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StudentProgressComponent {
  private readonly auth = inject(AuthService);
  private readonly reports = inject(ReportsService);

  readonly summary = signal<StudentSummary | null>(null);
  readonly isLoading = signal(true);
  readonly loadError = signal<string | null>(null);

  constructor() {
    const id = this.auth.userId();
    if (id) {
      void this.load(id);
    } else {
      this.isLoading.set(false);
      this.loadError.set('No se pudo identificar tu usuario. Iniciá sesión de nuevo.');
    }
  }

  async load(id: string): Promise<void> {
    this.isLoading.set(true);
    this.loadError.set(null);
    try {
      const summary = await this.reports.getStudentSummary(id);
      this.summary.set(summary);
      if (!summary) {
        this.loadError.set('Todavía no hay datos de tu progreso. Completá una evaluación para verlo.');
      }
    } catch (error) {
      this.loadError.set(error instanceof Error ? error.message : 'Error al cargar tu progreso');
    } finally {
      this.isLoading.set(false);
    }
  }

  scorePct(score: number): number {
    const pct = Math.round(score * 100);
    return Math.max(0, Math.min(100, pct));
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
