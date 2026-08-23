import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { SidebarComponent } from '@shared/ui/sidebar/sidebar.component';
import { SidebarService } from '@shared/ui/sidebar/sidebar.service';
import { InitialAssessmentService } from '@core/student/initial-assessment.service';
import { STUDENT_NAV_ITEMS } from './student-nav-items';

// Rutas que sólo tienen sentido tras la evaluación inicial.
const GATED_ROUTES = ['/student/route', '/student/progress'];

@Component({
  selector: 'app-student-layout',
  standalone: true,
  imports: [SidebarComponent, RouterOutlet],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="student-layout">
      <app-sidebar [navItems]="navItems()" roleLabel="Estudiante" />
      <main class="student-layout__content" [class.student-layout__content--collapsed]="isCollapsed()">
        <router-outlet />
      </main>
    </div>
  `,
  styles: `
    .student-layout {
      display: flex;
      min-height: 100vh;
    }

    .student-layout__content {
      flex: 1;
      margin-left: 250px;
      padding: 2rem;
      background-color: var(--color-light-2);
      transition: margin-left 0.3s ease;
    }

    .student-layout__content--collapsed {
      margin-left: 60px;
    }
  `,
})
export class StudentLayoutComponent {
  private readonly sidebarService = inject(SidebarService);
  private readonly initialAssessment = inject(InitialAssessmentService);

  protected readonly isCollapsed = this.sidebarService.isCollapsed;

  // Arranca mostrando todo; si el estudiante no se evaluó, se ocultan los módulos "gated".
  private readonly hasCompleted = signal(true);
  protected readonly navItems = computed(() =>
    this.hasCompleted()
      ? STUDENT_NAV_ITEMS
      : STUDENT_NAV_ITEMS.filter((item) => !GATED_ROUTES.includes(item.route)),
  );

  constructor() {
    void this.loadStatus();
  }

  private async loadStatus(): Promise<void> {
    const completed = await this.initialAssessment.hasCompleted();
    this.hasCompleted.set(completed);
  }
}
