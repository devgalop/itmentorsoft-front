import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'app-student-dashboard',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="placeholder">
      <h1>Dashboard Estudiante</h1>
      <p>Próximamente: evaluación inicial, ruta de aprendizaje y progreso.</p>
    </div>
  `,
  styles: `
    .placeholder h1 {
      color: var(--color-primary);
      font-size: 1.5rem;
      font-weight: 800;
    }

    .placeholder p {
      color: var(--color-mid-2);
      margin-top: 0.5rem;
    }
  `,
})
export class StudentDashboardComponent {}