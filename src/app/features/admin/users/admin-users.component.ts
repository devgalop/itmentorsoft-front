import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { UsersService } from '@core/users/users.service';
import { ToastService } from '@shared/ui/toast/toast.service';
import { CreateUserPayload } from '@core/users/users.types';

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

  constructor() {
    void this.loadRoles();
  }

  private async loadRoles(): Promise<void> {
    this.isLoadingRoles.set(true);
    try {
      const roles = await this.users.getAvailableRoles();
      this.roles.set(roles);
      if (roles.length > 0 && !this.form.controls.role.value) {
        this.form.controls.role.setValue(roles[0]!);
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
