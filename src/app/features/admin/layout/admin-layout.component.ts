import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { SidebarComponent } from '@shared/ui/sidebar/sidebar.component';
import { SidebarService } from '@shared/ui/sidebar/sidebar.service';
import { ADMIN_NAV_ITEMS } from './admin-nav-items';

@Component({
  selector: 'app-admin-layout',
  standalone: true,
  imports: [SidebarComponent, RouterOutlet],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="admin-layout">
      <app-sidebar [navItems]="navItems" roleLabel="Administrador" />
      <main class="admin-layout__content" [class.admin-layout__content--collapsed]="isCollapsed()">
        <router-outlet />
      </main>
    </div>
  `,
  styles: `
    .admin-layout {
      display: flex;
      min-height: 100vh;
    }

    .admin-layout__content {
      flex: 1;
      margin-left: 250px;
      padding: 2rem;
      background-color: var(--color-light-2);
      transition: margin-left 0.3s ease;
    }

    .admin-layout__content--collapsed {
      margin-left: 60px;
    }
  `,
})
export class AdminLayoutComponent {
  private readonly sidebarService = inject(SidebarService);
  protected readonly isCollapsed = this.sidebarService.isCollapsed;
  protected readonly navItems = ADMIN_NAV_ITEMS;
}
