import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AssessmentsService } from '@core/assessments/assessments.service';
import { AI_PROCESSES, AI_PROCESS_LABELS } from '@core/assessments/assessments.types';
import { ReportsService } from '@core/reports/reports.service';
import { ContentService } from '@core/content/content.service';
import { UsersService } from '@core/users/users.service';
import { ApprovalService } from '@core/admin/approval.service';
import { roleLabel } from '@core/users/role-label';
import { levelColor, roleColor } from '@shared/charts/chart-colors';
import { ChartItem } from '@shared/charts/chart-item';
import { ColumnChartComponent } from '@shared/charts/column-chart.component';
import { StatCardsComponent } from '@shared/charts/stat-cards.component';

/** Aviso del panel: algo que el administrador debería revisar. */
export interface AttentionItem {
  tone: 'warn' | 'info';
  text: string;
  route: string;
  action: string;
}

/** Categorías de estudiante, de menor a mayor nivel (las mismas de Reportes). */
const LEVELS = ['principiante', 'básico', 'intermedio', 'avanzado'] as const;

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [RouterLink, ColumnChartComponent, StatCardsComponent],
  templateUrl: './admin-dashboard.component.html',
  styleUrl: './admin-dashboard.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminDashboardComponent {
  private readonly reports = inject(ReportsService);
  private readonly content = inject(ContentService);
  private readonly users = inject(UsersService);
  private readonly approval = inject(ApprovalService);
  private readonly assessments = inject(AssessmentsService);

  readonly studentsTotal = signal<number | null>(null);
  readonly connectedTotal = signal<number | null>(null);
  readonly rolesTotal = signal<number | null>(null);
  readonly resourcesTotal = signal<number | null>(null);
  readonly pendingTotal = signal<number | null>(null);

  /** Modelo de IA en uso por cada proceso; null mientras carga o si no se pudo consultar. */
  readonly modelsInUse = signal<{ label: string; model: string | null }[] | null>(null);

  readonly isLoading = signal(true);

  /** Usuarios por rol y estudiantes por categoría (para las dos gráficas). */
  readonly roleItems = signal<ChartItem[]>([]);
  readonly levelItems = signal<ChartItem[]>([]);
  readonly isLoadingCharts = signal(true);
  readonly classifiedTotal = computed(() => this.levelItems().reduce((sum, i) => sum + i.count, 0));

  /** Lo que requiere atención: preguntas por aprobar, procesos sin modelo y estudiantes sin categoría. */
  readonly attention = computed<AttentionItem[]>(() => {
    const items: AttentionItem[] = [];
    const pending = this.pendingTotal();
    if (pending !== null && pending > 0) {
      items.push({
        tone: 'warn',
        text: `${pending} ${pending === 1 ? 'pregunta pendiente' : 'preguntas pendientes'} de aprobación`,
        route: '/admin/content-approval',
        action: 'Revisar',
      });
    }
    for (const m of this.modelsInUse() ?? []) {
      if (!m.model) {
        items.push({
          tone: 'warn',
          text: `El proceso "${m.label}" no tiene modelo asignado`,
          route: '/admin/config',
          action: 'Configurar',
        });
      }
    }
    const students = this.studentsTotal();
    if (!this.isLoadingCharts() && students !== null && students > 0 && this.classifiedTotal() === 0) {
      items.push({
        tone: 'info',
        text: 'Ningún estudiante tiene categoría todavía',
        route: '/admin/reports',
        action: 'Ver reportes',
      });
    }
    return items;
  });

  /** true cuando ya se cargó todo lo que alimenta los avisos. */
  readonly attentionReady = computed(() => !this.isLoading() && !this.isLoadingCharts());

  constructor() {
    void this.load();
    void this.loadCharts();
  }

  async load(): Promise<void> {
    this.isLoading.set(true);

    const [students, connected, roles, contents, pending, models] = await Promise.allSettled([
      this.reports.getStudents(0, 100),
      this.users.getConnectedTotal(),
      this.users.getAvailableRoles(),
      this.content.getAllContents(0, 100),
      this.approval.getPending(0, 1),
      this.assessments.getModelSelected(),
    ]);

    if (students.status === 'fulfilled') {
      this.studentsTotal.set(students.value.total);
    }
    if (connected.status === 'fulfilled') {
      this.connectedTotal.set(connected.value);
    }
    if (roles.status === 'fulfilled') {
      this.rolesTotal.set(roles.value.length);
    }
    if (contents.status === 'fulfilled') {
      this.resourcesTotal.set(contents.value.length);
    }
    if (pending.status === 'fulfilled') {
      this.pendingTotal.set(pending.value.total);
    }

    if (models.status === 'fulfilled') {
      this.modelsInUse.set(
        AI_PROCESSES.map((process) => ({
          label: AI_PROCESS_LABELS[process],
          model: models.value.find((m) => m.process === process)?.model_id ?? null,
        })),
      );
    }

    this.isLoading.set(false);
  }

  /** Distribución de usuarios por rol y de estudiantes por categoría. */
  private async loadCharts(): Promise<void> {
    this.isLoadingCharts.set(true);
    const [roles, levels] = await Promise.allSettled([this.loadRoleItems(), this.loadLevelItems()]);
    if (roles.status === 'fulfilled') this.roleItems.set(roles.value);
    if (levels.status === 'fulfilled') this.levelItems.set(levels.value);
    this.isLoadingCharts.set(false);
  }

  private async loadRoleItems(): Promise<ChartItem[]> {
    const roles = await this.users.getAvailableRoles();
    return Promise.all(
      roles.map(async (role) => {
        const count = await this.reports.getUsersByRoleTotal(role).catch(() => 0);
        return { key: role, label: roleLabel(role), count, color: roleColor(role) };
      }),
    );
  }

  private loadLevelItems(): Promise<ChartItem[]> {
    return Promise.all(
      LEVELS.map(async (level) => {
        const count = await this.reports.getCategorySummary(level).catch(() => 0);
        return { key: level, label: capitalize(level), count, color: levelColor(level) };
      }),
    );
  }
}
