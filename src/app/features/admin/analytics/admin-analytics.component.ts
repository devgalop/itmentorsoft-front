import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { ReportsService } from '@core/reports/reports.service';
import { UsersService } from '@core/users/users.service';

interface DistributionItem {
  value: string;
  label: string;
  count: number;
}

/** Categorías de clasificación conocidas (mismas que usa Reportes del docente). */
const CATEGORIES: { value: string; label: string }[] = [
  { value: 'principiante', label: 'Principiante' },
  { value: 'básico', label: 'Básico' },
  { value: 'intermedio', label: 'Intermedio' },
  { value: 'avanzado', label: 'Avanzado' },
];

@Component({
  selector: 'app-admin-analytics',
  standalone: true,
  imports: [],
  templateUrl: './admin-analytics.component.html',
  styleUrl: './admin-analytics.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminAnalyticsComponent {
  private readonly reports = inject(ReportsService);
  private readonly usersService = inject(UsersService);

  /** Distribución de usuarios por rol. */
  readonly usersByRole = signal<DistributionItem[]>([]);
  readonly isLoadingUsersByRole = signal(true);
  readonly usersByRoleTotal = computed(() =>
    this.usersByRole().reduce((acc, d) => acc + d.count, 0),
  );

  /** Distribución de estudiantes por categoría de conocimiento. */
  readonly studentsByCategory = signal<DistributionItem[]>([]);
  readonly isLoadingStudentsByCategory = signal(true);
  readonly studentsByCategoryTotal = computed(() =>
    this.studentsByCategory().reduce((acc, d) => acc + d.count, 0),
  );

  constructor() {
    void this.loadUsersByRole();
    void this.loadStudentsByCategory();
  }

  /** Etiqueta legible del rol. */
  roleLabel(role: string): string {
    const map: Record<string, string> = {
      admin: 'Administrador',
      teacher: 'Docente',
      student: 'Estudiante',
    };
    return map[role.toLowerCase()] ?? role;
  }

  /** Porcentaje que representa un conteo sobre un total (para las barras). */
  percent(count: number, total: number): number {
    return total === 0 ? 0 : Math.round((count / total) * 100);
  }

  private async loadUsersByRole(): Promise<void> {
    this.isLoadingUsersByRole.set(true);
    try {
      const roles = await this.usersService.getAvailableRoles();
      const counts = await Promise.all(
        roles.map(async (role) => {
          try {
            const count = await this.reports.getUsersByRoleTotal(role);
            return { value: role, label: this.roleLabel(role), count };
          } catch {
            return { value: role, label: this.roleLabel(role), count: 0 };
          }
        }),
      );
      this.usersByRole.set(counts);
    } catch {
      this.usersByRole.set([]);
    } finally {
      this.isLoadingUsersByRole.set(false);
    }
  }

  private async loadStudentsByCategory(): Promise<void> {
    this.isLoadingStudentsByCategory.set(true);
    try {
      const counts = await Promise.all(
        CATEGORIES.map(async (c) => {
          try {
            const count = await this.reports.getCategorySummary(c.value);
            return { value: c.value, label: c.label, count };
          } catch {
            return { value: c.value, label: c.label, count: 0 };
          }
        }),
      );
      this.studentsByCategory.set(counts);
    } finally {
      this.isLoadingStudentsByCategory.set(false);
    }
  }
}
