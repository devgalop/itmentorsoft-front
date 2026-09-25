import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { SidebarComponent } from '@shared/ui/sidebar/sidebar.component';
import { SidebarService } from '@shared/ui/sidebar/sidebar.service';
import { TEACHER_NAV_ITEMS } from './teacher-nav-items';

@Component({
  selector: 'app-teacher-layout',
  standalone: true,
  imports: [SidebarComponent, RouterOutlet],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="teacher-layout">
      <app-sidebar [navItems]="navItems" roleLabel="Docente" profileRoute="/teacher/profile" />
      <main class="teacher-layout__content" [class.teacher-layout__content--collapsed]="isCollapsed()">
        <router-outlet />
      </main>
    </div>
  `,
  styles: `
    .teacher-layout {
      display: flex;
      min-height: 100vh;
    }

    .teacher-layout__content {
      flex: 1;
      margin-left: 250px;
      padding: 2rem;
      background-color: var(--color-light-2);
      transition: margin-left 0.3s ease;
    }

    .teacher-layout__content--collapsed {
      margin-left: 60px;
    }

    @media (max-width: 900px) {
      .teacher-layout__content,
      .teacher-layout__content--collapsed {
        margin-left: 0;
        padding: 4.5rem 1rem 1.5rem;
      }
    }
  `,
})
export class TeacherLayoutComponent {
  private readonly sidebarService = inject(SidebarService);
  protected readonly isCollapsed = this.sidebarService.isCollapsed;
  protected readonly navItems = TEACHER_NAV_ITEMS;
}
