import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

@Component({
  selector: 'app-student-placeholder',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="placeholder">
      <h1>{{ title }}</h1>
      <p>{{ subtitle }}</p>
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
export class StudentPlaceholderComponent {
  private readonly route = inject(ActivatedRoute);
  protected readonly title: string = this.route.snapshot.data['title'] ?? 'Próximamente';
  protected readonly subtitle: string =
    this.route.snapshot.data['subtitle'] ?? 'Esta sección estará disponible pronto.';
}
