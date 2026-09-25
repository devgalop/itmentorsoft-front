import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { ReactiveFormsModule, FormControl, FormGroup, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthService } from '@core/auth/auth.service';
import { UsersService } from '@core/users/users.service';
import { UserInfo } from '@core/users/users.types';
import { ToastService } from '@shared/ui/toast/toast.service';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [RouterLink, ReactiveFormsModule],
  templateUrl: './profile.component.html',
  styleUrl: './profile.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProfileComponent {
  private readonly auth = inject(AuthService);
  private readonly users = inject(UsersService);
  private readonly toast = inject(ToastService);

  readonly user = signal<UserInfo | null>(null);
  readonly isLoading = signal(true);
  readonly loadError = signal<string | null>(null);

  readonly isEditing = signal(false);
  readonly isSaving = signal(false);

  readonly editForm = new FormGroup({
    name: new FormControl('', [
      Validators.required,
      Validators.minLength(3),
      Validators.maxLength(100),
    ]),
    username: new FormControl('', [
      Validators.required,
      Validators.minLength(3),
      Validators.maxLength(20),
      Validators.pattern(/^\w+$/),
    ]),
  });

  constructor() {
    const id = this.auth.userId();
    if (id) {
      void this.load(id);
    } else {
      this.isLoading.set(false);
      this.loadError.set('No se pudo identificar tu usuario. Iniciá sesión de nuevo.');
    }
  }

  async load(id: string): Promise<void> {
    this.isLoading.set(true);
    this.loadError.set(null);
    try {
      const user = await this.users.getUser(id);
      this.user.set(user);
      if (!user) {
        this.loadError.set('No se encontraron los datos de tu perfil.');
      }
    } catch (error) {
      this.loadError.set(error instanceof Error ? error.message : 'Error al cargar tu perfil');
    } finally {
      this.isLoading.set(false);
    }
  }

  startEdit(): void {
    const u = this.user();
    if (!u) return;
    this.editForm.setValue({ name: u.name ?? '', username: u.username ?? '' });
    this.isEditing.set(true);
  }

  cancelEdit(): void {
    this.isEditing.set(false);
  }

  get nameControl(): FormControl {
    return this.editForm.get('name') as FormControl;
  }

  get usernameControl(): FormControl {
    return this.editForm.get('username') as FormControl;
  }

  getNameError(): string | null {
    const c = this.nameControl;
    if (!c.touched) return null;
    if (c.hasError('required')) return 'El nombre es requerido';
    if (c.hasError('minlength')) return 'Mínimo 3 caracteres';
    if (c.hasError('maxlength')) return 'Máximo 100 caracteres';
    return null;
  }

  getUsernameError(): string | null {
    const c = this.usernameControl;
    if (!c.touched) return null;
    if (c.hasError('required')) return 'El nombre de usuario es requerido';
    if (c.hasError('minlength')) return 'Mínimo 3 caracteres';
    if (c.hasError('maxlength')) return 'Máximo 20 caracteres';
    if (c.hasError('pattern')) return 'Solo letras, números y guion bajo';
    return null;
  }

  async save(): Promise<void> {
    const u = this.user();
    this.editForm.markAllAsTouched();
    if (!u || this.editForm.invalid) return;

    const { name, username } = this.editForm.value;
    this.isSaving.set(true);
    this.editForm.disable();
    try {
      const response = await this.users.updateProfile({
        user_id: u.user_id,
        username: username!,
        name: name!,
      });
      if (response.is_success) {
        this.user.set({ ...u, username: username!, name: name! });
        this.isEditing.set(false);
        this.toast.success('Perfil actualizado', 'Tus datos se guardaron correctamente.');
      } else {
        this.toast.error('No se pudo actualizar', response.message);
      }
    } catch (error) {
      this.toast.error(
        'No se pudo actualizar',
        error instanceof Error ? error.message : 'Error inesperado',
      );
    } finally {
      this.isSaving.set(false);
      this.editForm.enable();
    }
  }

  initials(name: string): string {
    const parts = (name ?? '').split(/[\s._-]+/).filter(Boolean);
    if (parts.length === 0) return '';
    if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
    return parts
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase() ?? '')
      .join('');
  }

  roleLabel(role: string): string {
    const map: Record<string, string> = {
      admin: 'Administrador',
      teacher: 'Docente',
      student: 'Estudiante',
    };
    return map[(role ?? '').toLowerCase()] ?? role;
  }
}
