import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { SidebarComponent } from '@shared/ui/sidebar/sidebar.component';
import { SidebarService } from '@shared/ui/sidebar/sidebar.service';
import { STUDENT_NAV_ITEMS } from './student-nav-items';

@Component({
  selector: 'app-student-layout',
  standalone: true,
  imports: [SidebarComponent, RouterOutlet],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="student-layout">
      <app-sidebar [navItems]="navItems" roleLabel="Estudiante" />
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
  protected readonly isCollapsed = this.sidebarService.isCollapsed;
  protected readonly navItems = STUDENT_NAV_ITEMS;
}