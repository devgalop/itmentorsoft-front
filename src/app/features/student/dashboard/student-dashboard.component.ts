import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '@core/auth/auth.service';
import { StudentAssessmentService } from '@core/assessments/student-assessment.service';
import { ReportsService } from '@core/reports/reports.service';
import { UsersService } from '@core/users/users.service';

interface StatCard {
  value: string;
  label: string;
  hint: string;
  route?: string;
}

interface HowToStep {
  title: string;
  description: string;
}

@Component({
  selector: 'app-student-dashboard',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './student-dashboard.component.html',
  styleUrl: './student-dashboard.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StudentDashboardComponent {
  private readonly authService = inject(AuthService);
  private readonly studentAssessment = inject(StudentAssessmentService);
  private readonly reports = inject(ReportsService);
  private readonly usersService = inject(UsersService);

  /** Nombre del estudiante para el saludo (username del JWT). */
  /** Nombre real del estudiante (se carga del backend). */
  private readonly displayName = signal<string | null>(null);
  /** Lo que se muestra en el saludo: el nombre, o el username si aún no llegó. */
  readonly userName = computed(
    () => this.displayName() ?? this.authService.user()?.userName ?? 'Estudiante',
  );

  /** Cantidad de evaluaciones realizadas. null mientras carga o si falla (se muestra '0'). */
  private readonly assessmentsCount = signal<number | null>(null);

  /** Categoría (clasificación) asignada por el modelo ML. null si no hay evaluación aún o falla la carga. */
  readonly classification = signal<string | null>(null);

  // Progreso en ruta sigue sin backend expuesto al front (falta path_id) → "sin datos".
  readonly stats = computed<StatCard[]>(() => [
    {
      value: this.classification() ?? '—',
      label: 'Categoría asignada',
      hint: this.classification() ? 'Según tu evaluación inicial' : 'Evaluación pendiente',
      route: '/student/progress',
    },
    { value: '0%', label: 'Progreso en ruta', hint: 'Sin ruta asignada', route: '/student/route' },
    {
      value: String(this.assessmentsCount() ?? 0),
      label: 'Evaluaciones realizadas',
      hint: 'Completa la inicial',
      route: '/student/assessments',
    },
  ]);

  // Contenido estático (informativo), tal cual el mockup.
  readonly steps: HowToStep[] = [
    {
      title: 'Realiza la evaluación diagnóstica',
      description: 'Preguntas de Diseño SW y Pensamiento Computacional.',
    },
    {
      title: 'El modelo ML te categoriza',
      description: 'Asigna tu nivel: Principiante, Básico, Intermedio o Avanzado.',
    },
    {
      title: 'Recibe tu ruta personalizada',
      description: 'Evaluaciones adaptadas a tus debilidades.',
    },
  ];

  constructor() {
    const id = this.authService.userId();
    if (id) {
      void this.loadDisplayName(id);
      void this.loadAssessmentsCount(id);
      void this.loadClassification(id);
    }
  }

  /**
   * El JWT solo trae el usuario (username); el nombre real se pide al backend. Mientras
   * llega, o si falla, el saludo usa el username.
   */
  private async loadDisplayName(userId: string): Promise<void> {
    try {
      const user = await this.usersService.getUser(userId);
      const name = user?.name?.trim();
      if (name) this.displayName.set(name);
    } catch {
      // Sin nombre: se queda con el username.
    }
  }

  private async loadAssessmentsCount(userId: string): Promise<void> {
    try {
      const total = await this.studentAssessment.getQuantity(userId);
      this.assessmentsCount.set(total);
    } catch {
      // Silencioso: la card se queda en 0, igual que antes de conectar el backend.
    }
  }

  private async loadClassification(userId: string): Promise<void> {
    try {
      const progress = await this.reports.getStudentProgress(userId);
      this.classification.set(progress?.classification ?? null);
    } catch {
      // Silencioso: la card se queda en '—', igual que antes de conectar el backend
      // (por ejemplo, un estudiante que todavía no tiene evaluación inicial).
    }
  }
}
