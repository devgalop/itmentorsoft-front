import {
  ChangeDetectionStrategy,
  Component,
  HostListener,
  computed,
  inject,
  signal,
} from '@angular/core';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { AuthService } from '@core/auth/auth.service';
import { ReportsService } from '@core/reports/reports.service';
import { UsersService } from '@core/users/users.service';
import { ToastService } from '@shared/ui/toast/toast.service';
import { CreateUserPayload, UserStatus } from '@core/users/users.types';

/** Usuario de la lista de gestión: id y rol vienen del reporte; el resto, del detalle del usuario. */
export interface ManagedUser {
  user_id: string;
  name: string;
  username: string;
  email: string;
}

/** Estados a los que se puede mover un usuario activo (el listado solo trae usuarios activos). */
export const STATUS_ACTIONS: { value: UserStatus; action: string; label: string }[] = [
  { value: 'inactive', action: 'Inactivar', label: 'inactivo' },
  { value: 'suspended', action: 'Suspender', label: 'suspendido' },
];

/** username: alfanumérico + guion bajo (coincide con \w+ del backend). */
function usernamePattern(control: AbstractControl): ValidationErrors | null {
  const value = (control.value ?? '') as string;
  if (!value) return null;
  return /^\w+$/.test(value) ? null : { username: true };
}

@Component({
  selector: 'app-admin-users',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './admin-users.component.html',
  styleUrl: './admin-users.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminUsersComponent {
  private readonly fb = inject(FormBuilder);
  private readonly users = inject(UsersService);
  private readonly toast = inject(ToastService);
  private readonly reports = inject(ReportsService);
  private readonly auth = inject(AuthService);

  readonly roles = signal<string[]>([]);
  readonly isLoadingRoles = signal(false);

  readonly isSubmitting = signal(false);

  readonly form = this.fb.nonNullable.group({
    email: [
      '',
      [Validators.required, Validators.minLength(5), Validators.maxLength(255), Validators.email],
    ],
    username: [
      '',
      [Validators.required, Validators.minLength(3), Validators.maxLength(20), usernamePattern],
    ],
    role: ['', [Validators.required]],
  });

  readonly statusActions = STATUS_ACTIONS;

  /** Gestión de estado: usuarios activos del rol elegido. */
  readonly manageRole = signal('');
  readonly managedUsers = signal<ManagedUser[]>([]);
  readonly isLoadingManaged = signal(false);
  readonly manageError = signal<string | null>(null);

  /** Cambio de estado pendiente de confirmar (abre el modal). */
  readonly pendingChange = signal<{ user: ManagedUser; status: UserStatus } | null>(null);
  readonly isChangingStatus = signal(false);
  readonly pendingLabel = computed(
    () => STATUS_ACTIONS.find((a) => a.value === this.pendingChange()?.status)?.label ?? '',
  );

  constructor() {
    void this.loadRoles();
  }

  /** Un admin no puede cambiarse el estado a sí mismo (quedaría sin acceso). */
  isSelf(userId: string): boolean {
    return this.auth.userId() === userId;
  }

  onManageRoleChange(role: string): void {
    void this.loadManagedUsers(role);
  }

  private async loadManagedUsers(role: string): Promise<void> {
    this.manageRole.set(role);
    this.manageError.set(null);
    this.managedUsers.set([]);
    if (!role) return;
    this.isLoadingManaged.set(true);
    try {
      const byRole = await this.reports.getUsersByRole(role);
      const details = await Promise.allSettled(byRole.map((u) => this.users.getUser(u.user_id)));
      // Si el admin cambió de rol mientras cargaba, se descarta esta respuesta.
      if (this.manageRole() !== role) return;
      this.managedUsers.set(
        byRole.map((u, i) => {
          const result = details[i];
          const info = result?.status === 'fulfilled' ? result.value : null;
          return {
            user_id: u.user_id,
            name: info?.name ?? '(sin datos)',
            username: info?.username ?? u.user_id.slice(0, 8),
            email: info?.email ?? '',
          };
        }),
      );
    } catch {
      // El backend responde con error cuando el rol no tiene usuarios activos.
      if (this.manageRole() !== role) return;
      this.manageError.set('No hay usuarios activos con este rol (o no se pudieron cargar).');
    } finally {
      if (this.manageRole() === role) this.isLoadingManaged.set(false);
    }
  }

  askStatusChange(user: ManagedUser, status: UserStatus): void {
    if (this.isSelf(user.user_id)) return;
    this.pendingChange.set({ user, status });
  }

  cancelStatusChange(): void {
    if (this.isChangingStatus()) return;
    this.pendingChange.set(null);
  }

  /** Escape cierra el modal de confirmación (no mientras se está aplicando el cambio). */
  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.pendingChange()) this.cancelStatusChange();
  }

  async confirmStatusChange(): Promise<void> {
    const pending = this.pendingChange();
    if (!pending || this.isChangingStatus()) return;
    this.isChangingStatus.set(true);
    try {
      const response = await this.users.updateUserStatus(pending.user.user_id, pending.status);
      if (!response.is_success) {
        throw new Error(response.message || 'No se pudo cambiar el estado.');
      }
      this.toast.success(
        'Estado actualizado',
        `${pending.user.name} ahora está ${this.pendingLabel()}.`,
      );
      this.pendingChange.set(null);
      // El usuario ya no es activo: sale de la lista.
      this.managedUsers.update((list) => list.filter((u) => u.user_id !== pending.user.user_id));
    } catch (error) {
      this.toast.error(
        'No se pudo cambiar el estado',
        error instanceof Error ? error.message : 'Error inesperado',
      );
    } finally {
      this.isChangingStatus.set(false);
    }
  }

  private async loadRoles(): Promise<void> {
    this.isLoadingRoles.set(true);
    try {
      const roles = await this.users.getAvailableRoles();
      this.roles.set(roles);
      if (roles.length > 0 && !this.form.controls.role.value) {
        this.form.controls.role.setValue(roles[0]!);
      }
      if (roles.length > 0) {
        void this.loadManagedUsers(roles[0]!);
      }
    } catch {
      // Silencioso: el dropdown queda vacío y el required evita enviar.
    } finally {
      this.isLoadingRoles.set(false);
    }
  }

  fieldError(control: AbstractControl | null): string | null {
    if (!control || !control.touched || !control.errors) {
      return null;
    }
    const e = control.errors;
    if (e['required']) return 'Requerido';
    if (e['email']) return 'Email inválido';
    if (e['minlength']) return `Mínimo ${e['minlength'].requiredLength} caracteres`;
    if (e['maxlength']) return `Máximo ${e['maxlength'].requiredLength} caracteres`;
    if (e['username']) return 'Solo letras, números y guion bajo';
    return 'Inválido';
  }

  async submit(): Promise<void> {

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.isSubmitting.set(true);
    const payload = this.form.getRawValue() as CreateUserPayload;

    try {
      const response = await this.users.createUser(payload);
      if (response.is_success) {
        this.toast.success('Usuario creado', 'El usuario se registró correctamente.');
        this.resetForm();
      } else {
        this.toast.error('No se pudo crear', response.message || 'Intentá nuevamente.');
      }
    } catch (error) {
      this.toast.error('Error al crear usuario', error instanceof Error ? error.message : 'Error inesperado');
    } finally {
      this.isSubmitting.set(false);
    }
  }

  private resetForm(): void {
    const firstRole = this.roles()[0] ?? '';
    this.form.reset({ email: '', username: '', role: firstRole });
  }
}
