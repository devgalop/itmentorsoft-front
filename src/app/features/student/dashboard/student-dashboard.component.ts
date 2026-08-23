import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { AuthService } from '@core/auth/auth.service';

interface StatCard {
  value: string;
  label: string;
  hint: string;
}

interface HowToStep {
  title: string;
  description: string;
}

@Component({
  selector: 'app-student-dashboard',
  standalone: true,
  templateUrl: './student-dashboard.component.html',
  styleUrl: './student-dashboard.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StudentDashboardComponent {
  private readonly authService = inject(AuthService);

  /** Nombre del estudiante para el saludo (username del JWT). */
  readonly userName = computed(() => this.authService.user()?.userName ?? 'Estudiante');

  // Estructura del mockup. Sin backend de progreso todavía → valores "sin datos".
  readonly stats: StatCard[] = [
    { value: '—', label: 'Categoría asignada', hint: 'Pendiente evaluación' },
    { value: '0%', label: 'Progreso en ruta', hint: 'Sin ruta asignada' },
    { value: '0', label: 'Evaluaciones realizadas', hint: 'Completá la inicial' },
  ];

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
}
