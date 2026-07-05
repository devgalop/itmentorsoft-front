import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'app-teacher-dashboard',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="placeholder">
      <h1>Dashboard Docente</h1>
      <p>Próximamente: banco de preguntas, creación y edición de evaluaciones.</p>
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
export class TeacherDashboardComponent {}
