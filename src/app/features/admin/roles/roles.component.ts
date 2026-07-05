import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { UsersService } from '@core/users/users.service';
import { UserInfo } from '@core/users/users.types';

@Component({
  selector: 'app-roles',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './roles.component.html',
  styleUrl: './roles.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RolesComponent {
  private readonly usersService = inject(UsersService);

  readonly userIdControl = new FormControl('', {
    nonNullable: true,
    validators: [Validators.required, Validators.minLength(3), Validators.maxLength(100)],
  });

  readonly availableRoles = signal<string[]>([]);
  readonly selectedRole = signal<string>('');
  readonly rolesError = signal<string | null>(null);

  readonly foundUser = signal<UserInfo | null>(null);
  readonly isSearching = signal(false);
  readonly searchError = signal<string | null>(null);
  readonly searched = signal(false);

  readonly isAssigning = signal(false);
  readonly assignError = signal<string | null>(null);
  readonly assignSuccess = signal<string | null>(null);

  constructor() {
    void this.loadRoles();
  }

  private async loadRoles(): Promise<void> {
    try {
      const roles = await this.usersService.getAvailableRoles();
      this.availableRoles.set(roles);
      if (roles.length > 0) {
        this.selectedRole.set(roles[0]!);
      }
    } catch (error) {
      this.rolesError.set(error instanceof Error ? error.message : 'No se pudieron cargar los roles');
    }
  }

  onRoleChange(role: string): void {
    this.selectedRole.set(role);
  }

  getUserIdError(): string | null {
    const c = this.userIdControl;
    if (!c.touched) return null;
    if (c.hasError('required')) return 'El ID de usuario es requerido';
    if (c.hasError('minlength')) return 'Debe tener al menos 3 caracteres';
    if (c.hasError('maxlength')) return 'No puede superar los 100 caracteres';
    return null;
  }

  async searchUser(): Promise<void> {
    this.searchError.set(null);
    this.assignError.set(null);
    this.assignSuccess.set(null);
    this.userIdControl.markAsTouched();
    if (this.userIdControl.invalid) {
      return;
    }

    this.isSearching.set(true);
    this.searched.set(true);
    this.foundUser.set(null);

    try {
      const user = await this.usersService.getUser(this.userIdControl.value.trim());
      this.foundUser.set(user);
      if (!user) {
        this.searchError.set('No se encontró un usuario con ese ID');
      }
    } catch (error) {
      this.searchError.set(error instanceof Error ? error.message : 'Error inesperado');
    } finally {
      this.isSearching.set(false);
    }
  }

  async assign(): Promise<void> {
    this.assignError.set(null);
    this.assignSuccess.set(null);

    const user = this.foundUser();
    const role = this.selectedRole();
    if (!user || !role) {
      return;
    }

    this.isAssigning.set(true);
    try {
      const response = await this.usersService.assignRole(user.user_id, role);
      if (response.is_success) {
        this.assignSuccess.set(response.message || 'Rol asignado correctamente');
        this.foundUser.set({ ...user, role });
      } else {
        this.assignError.set(response.message || 'No se pudo asignar el rol');
      }
    } catch (error) {
      this.assignError.set(error instanceof Error ? error.message : 'Error inesperado');
    } finally {
      this.isAssigning.set(false);
    }
  }
}
