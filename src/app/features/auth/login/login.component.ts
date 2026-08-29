import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { ReactiveFormsModule, FormControl, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '@core/auth/auth.service';
import { ToastService } from '@shared/ui/toast/toast.service';
import { InputComponent, ButtonComponent, FormFieldComponent } from '@shared/ui';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [ReactiveFormsModule, InputComponent, ButtonComponent, FormFieldComponent, RouterLink],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LoginComponent {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly toast = inject(ToastService);

  readonly loginForm = new FormGroup({
    email: new FormControl('', [Validators.required, Validators.email]),
    password: new FormControl('', [Validators.required, Validators.minLength(6)]),
  });

  readonly isLoading = signal(false);

  constructor() {
    if (this.route.snapshot.queryParamMap.get('expired') === '1') {
      this.toast.info(
        'Sesión expirada',
        'Tu sesión expiró por inactividad. Iniciá sesión de nuevo para continuar.',
      );
    }
  }

  get emailControl(): FormControl {
    return this.loginForm.get('email') as FormControl;
  }

  get passwordControl(): FormControl {
    return this.loginForm.get('password') as FormControl;
  }

  getEmailError(): string | null {
    const ctrl = this.emailControl;
    if (ctrl.hasError('required') && ctrl.touched) {
      return 'El email es requerido';
    }
    if (ctrl.hasError('email') && ctrl.touched) {
      return 'Ingresá un email válido';
    }
    return null;
  }

  getPasswordError(): string | null {
    const ctrl = this.passwordControl;
    if (ctrl.hasError('required') && ctrl.touched) {
      return 'La contraseña es requerida';
    }
    if (ctrl.hasError('minlength') && ctrl.touched) {
      return 'La contraseña debe tener al menos 6 caracteres';
    }
    return null;
  }

  async onSubmit(): Promise<void> {
    this.loginForm.markAllAsTouched();

    if (this.loginForm.invalid) {
      return;
    }

    const { email, password } = this.loginForm.value;

    this.isLoading.set(true);
    this.loginForm.disable();

    try {
      await this.authService.login({ email: email!, password: password! });
      await this.redirectByRole();
    } catch (error) {
      this.toast.error(
        'No se pudo iniciar sesión',
        error instanceof Error ? error.message : 'Error inesperado',
      );
    } finally {
      this.isLoading.set(false);
      this.loginForm.enable();
    }
  }

  private async redirectByRole(): Promise<void> {
    switch (this.authService.role()) {
      case 'admin':
        await this.router.navigate(['/admin']);
        break;
      case 'teacher':
        await this.router.navigate(['/teacher']);
        break;
      case 'student':
        await this.router.navigate(['/student']);
        break;
      default:
        await this.router.navigate(['/']);
    }
  }
}