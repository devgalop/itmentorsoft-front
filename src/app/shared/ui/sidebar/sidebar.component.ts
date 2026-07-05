import { ChangeDetectionStrategy, Component, Input, inject } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { ButtonComponent } from '@shared/ui';
import { AuthService } from '@core/auth/auth.service';
import { SidebarService } from './sidebar.service';
import { NavItem } from './nav-item.model';

interface NavGroup {
  title: string | null;
  items: NavItem[];
}

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [ButtonComponent, RouterLink, RouterLinkActive],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './sidebar.component.html',
  styleUrl: './sidebar.component.css',
})
export class SidebarComponent {
  @Input() navItems: NavItem[] = [];
  @Input() roleLabel: string = '';

  private readonly authService = inject(AuthService);
  private readonly sidebarService = inject(SidebarService);

  protected readonly isCollapsed = this.sidebarService.isCollapsed;

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
