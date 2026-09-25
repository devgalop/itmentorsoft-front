import { ChangeDetectionStrategy, Component, Input, computed, inject } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { ButtonComponent } from '@shared/ui';
import { AuthService } from '@core/auth/auth.service';
import { SidebarService } from './sidebar.service';
import { SidebarIconComponent } from './sidebar-icon.component';
import { NavItem } from './nav-item.model';

interface NavGroup {
  title: string | null;
  items: NavItem[];
}

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [ButtonComponent, RouterLink, RouterLinkActive, SidebarIconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './sidebar.component.html',
  styleUrl: './sidebar.component.css',
})
export class SidebarComponent {
  @Input() navItems: NavItem[] = [];
  @Input() roleLabel: string = '';
  /** Ruta a "Mi perfil" (varía por rol). Si no se pasa, no se muestra el avatar. */
  @Input() profileRoute: string = '';

  private readonly authService = inject(AuthService);
  private readonly sidebarService = inject(SidebarService);

  protected readonly isCollapsed = this.sidebarService.isCollapsed;

  /** Iniciales del usuario logueado (del username del JWT), para el avatar. */
  protected readonly userInitials = computed(() => {
    const userName = this.authService.user()?.userName ?? '';
    const parts = userName.split(/[\s._-]+/).filter(Boolean);
    if (parts.length === 0) return '';
    if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
    return parts
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase() ?? '')
      .join('');
  });

  /** Groups nav items by their optional `group`, preserving declaration order. */
  protected get navGroups(): NavGroup[] {
    const groups: NavGroup[] = [];
    for (const item of this.navItems) {
      const title = item.group ?? null;
      let group = groups.find((g) => g.title === title);
      if (!group) {
        group = { title, items: [] };
        groups.push(group);
      }
      group.items.push(item);
    }
    return groups;
  }

  protected toggle(): void {
    this.sidebarService.toggle();
  }

  protected onLogout(): void {
    this.authService.logout();
  }
}
