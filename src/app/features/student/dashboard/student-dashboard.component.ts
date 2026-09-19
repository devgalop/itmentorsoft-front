import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '@core/auth/auth.service';
import { StudentAssessmentService } from '@core/assessments/student-assessment.service';

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

  /** Nombre del estudiante para el saludo (username del JWT). */
  readonly userName = computed(() => this.authService.user()?.userName ?? 'Estudiante');

  /** Cantidad de evaluaciones realizadas. null mientras carga o si falla (se muestra '0'). */
  private readonly assessmentsCount = signal<number | null>(null);

  // Estructura del mockup. Progreso en ruta y categoría siguen sin backend → "sin datos".
  readonly stats = computed<StatCard[]>(() => [
    { value: '—', label: 'Categoría asignada', hint: 'Pendiente evaluación', route: '/student/progress' },
    { value: '0%', label: 'Progreso en ruta', hint: 'Sin ruta asignada', route: '/student/route' },
    {
      value: String(this.assessmentsCount() ?? 0),
      label: 'Evaluaciones realizadas',
      hint: 'Completá la inicial',
      route: '/student/assessments',
    },
  ]);

  // Contenido estático (informativo), tal cual el mockup.
  readonly steps: HowToStep[] = [
    {
      title: 'Realizá la evaluación diagnóstica',
      description: 'Preguntas de Diseño SW y Pensamiento Computacional.',
    },
    {
      title: 'El modelo ML te categoriza',
      description: 'Asigna tu nivel: Principiante, Básico, Intermedio o Avanzado.',
    },
    {
      title: 'Recibí tu ruta personalizada',
      description: 'Evaluaciones adaptadas a tus debilidades.',
    },
  ];

  constructor() {
    const id = this.authService.userId();
    if (id) {
      void this.loadAssessmentsCount(id);
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
}
