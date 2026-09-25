import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { UsersService } from '@core/users/users.service';

@Component({
  selector: 'app-roles',
  standalone: true,
  imports: [],
  templateUrl: './roles.component.html',
  styleUrl: './roles.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RolesComponent {
  private readonly usersService = inject(UsersService);

  readonly availableRoles = signal<string[]>([]);
  readonly isLoading = signal(true);
  readonly rolesError = signal<string | null>(null);

  constructor() {
    void this.loadRoles();
  }

  private async loadRoles(): Promise<void> {
    this.isLoading.set(true);
    this.rolesError.set(null);
    try {
      const roles = await this.usersService.getAvailableRoles();
      this.availableRoles.set(roles);
    } catch (error) {
      this.rolesError.set(error instanceof Error ? error.message : 'No se pudieron cargar los roles');
    } finally {
      this.isLoading.set(false);
    }
  }

  /** Etiqueta legible del rol. */
  roleLabel(role: string): string {
    const map: Record<string, string> = {
      admin: 'Administrador',
      teacher: 'Docente',
      student: 'Estudiante',
    };
    return map[role.toLowerCase()] ?? role;
  }
}
