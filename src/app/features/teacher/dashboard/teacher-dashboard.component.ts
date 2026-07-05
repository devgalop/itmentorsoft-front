import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '@core/auth/auth.service';

interface StatCard {
  label: string;
  hint: string;
}

@Component({
  selector: 'app-teacher-dashboard',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './teacher-dashboard.component.html',
  styleUrl: './teacher-dashboard.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TeacherDashboardComponent {
  private readonly authService = inject(AuthService);

  /** Nombre del docente para el saludo (username del JWT). */
  readonly userName = computed(() => this.authService.user()?.userName ?? 'Docente');

  // Estructura del mockup. Sin backend de métricas todavía → valores "sin datos".
  readonly stats: StatCard[] = [
    { label: 'Estudiantes activos', hint: 'Sin datos' },
    { label: 'Categorías activas', hint: 'Sin datos' },
    { label: 'Recursos activos', hint: 'Sin datos' },
    { label: 'Rúbricas pendientes', hint: 'Sin datos' },
  ];
}
