import { ChangeDetectionStrategy, Component, Input, inject } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { ButtonComponent } from '@shared/ui';
import { AuthService } from '@core/auth/auth.service';
import { SidebarService } from './sidebar.service';
import { NavItem } from './nav-item.model';

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

  protected toggle(): void {
    this.sidebarService.toggle();
  }

  protected onLogout(): void {
    this.authService.logout();
  }
}