import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { AssessmentsService } from '@core/assessments/assessments.service';
import { ContentService } from '@core/content/content.service';
import { TopContentItem } from '@core/content/content.types';
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
  private readonly assessments = inject(AssessmentsService);
  private readonly content = inject(ContentService);

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

  /** Contenidos mejor y peor calificados del tema elegido. */
  readonly topics = signal<string[]>([]);
  readonly selectedTopic = signal('');
  readonly topBest = signal<TopContentItem[]>([]);
  readonly topWorse = signal<TopContentItem[]>([]);
  readonly isLoadingTop = signal(false);
  /** true si falló alguna de las dos consultas (o el tema no tiene contenidos calificados). */
  readonly topUnavailable = signal(false);

  constructor() {
    void this.loadUsersByRole();
    void this.loadStudentsByCategory();
    void this.loadTopics();
  }

  onTopicChange(topic: string): void {
    void this.loadTop(topic);
  }

  /** Estrellas llenas (0–5) a partir del rating, para mostrar la valoración. */
  stars(rating: number): number {
    return Math.max(0, Math.min(5, Math.round(rating)));
  }

  /** Rating con un solo decimal (el backend manda el promedio completo, p. ej. 4.3333). */
  formatRating(rating: number): string {
    return rating.toFixed(1);
  }

  private async loadTopics(): Promise<void> {
    try {
      const topics = await this.assessments.getTopics();
      this.topics.set(topics);
      const first = topics[0];
      if (first !== undefined) await this.loadTop(first);
    } catch {
      this.topics.set([]);
    }
  }

  private async loadTop(topic: string): Promise<void> {
    this.selectedTopic.set(topic);
    this.isLoadingTop.set(true);
    this.topUnavailable.set(false);
    const [best, worse] = await Promise.allSettled([
      this.content.getTopBestContent(topic),
      this.content.getTopWorseContent(topic),
    ]);
    // Si el usuario cambió de tema mientras cargaba, se descarta esta respuesta.
    if (this.selectedTopic() !== topic) return;
    this.topBest.set(best.status === 'fulfilled' ? best.value : []);
    this.topWorse.set(worse.status === 'fulfilled' ? worse.value : []);
    this.topUnavailable.set(best.status === 'rejected' || worse.status === 'rejected');
    this.isLoadingTop.set(false);
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
