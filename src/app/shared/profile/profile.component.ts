import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '@core/auth/auth.service';
import { UsersService } from '@core/users/users.service';
import { UserInfo } from '@core/users/users.types';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './profile.component.html',
  styleUrl: './profile.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProfileComponent {
  private readonly auth = inject(AuthService);
  private readonly users = inject(UsersService);

  readonly user = signal<UserInfo | null>(null);
  readonly isLoading = signal(true);
  readonly loadError = signal<string | null>(null);

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
