import { Injectable, inject } from '@angular/core';
import { AuthService } from '@core/auth/auth.service';
import { ReportsService } from '@core/reports/reports.service';

/**
 * Determina si el estudiante ya completó su evaluación inicial.
 * Como el backend no expone una "cantidad de evaluaciones", se infiere a partir
 * del student_summary: si la clasificación es un placeholder en inglés (aún no
 * calculada) o el perfil viene vacío, se considera que no se ha evaluado.
 */
@Injectable({ providedIn: 'root' })
export class InitialAssessmentService {
  private readonly auth = inject(AuthService);
  private readonly reports = inject(ReportsService);

  private cached: boolean | null = null;
  private inFlight: Promise<boolean> | null = null;

  /** Limpia la caché (por ejemplo, tras completar una evaluación). */
  reset(): void {
    this.cached = null;
    this.inFlight = null;
  }

  async hasCompleted(): Promise<boolean> {
    if (this.cached !== null) return this.cached;
    if (this.inFlight) return this.inFlight;

    this.inFlight = this.compute();
    const result = await this.inFlight;
    this.cached = result;
    this.inFlight = null;
    return result;
  }

  private async compute(): Promise<boolean> {
    const id = this.auth.userId();
    if (!id) return false;
    try {
      const summary = await this.reports.getStudentSummary(id);
      if (!summary) return false;
      const hasProfile = Array.isArray(summary.profile) && summary.profile.length > 0;
      const classified = !this.isPlaceholder(summary.knowledge_classification);
      return hasProfile || classified;
    } catch {
      // Ante un error, no bloqueamos el acceso: asumimos que sí (mejor no ocultar de más).
      return true;
    }
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
}
