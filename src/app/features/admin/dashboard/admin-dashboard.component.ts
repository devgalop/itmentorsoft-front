import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AssessmentsService } from '@core/assessments/assessments.service';
import { AI_PROCESSES, AI_PROCESS_LABELS } from '@core/assessments/assessments.types';
import { ReportsService } from '@core/reports/reports.service';
import { ContentService } from '@core/content/content.service';
import { UsersService } from '@core/users/users.service';
import { ApprovalService } from '@core/admin/approval.service';
import { StudentClassification } from '@core/reports/reports.types';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [RouterLink],
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

  readonly recentStudents = signal<StudentClassification[]>([]);
  readonly isLoading = signal(true);

  constructor() {
    void this.load();
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
      this.recentStudents.set(students.value.students.slice(0, 5));
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

  initials(name: string): string {
    return name
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase() ?? '')
      .join('');
  }
}
