import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { distinctUntilChanged, map } from 'rxjs';
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
  /** El correo o la contraseña no coincidieron (la API no dice cuál, para no revelar qué correos existen). */
  readonly credentialsFailed = signal(false);

  constructor() {
    // Solo cuando cambian los valores: deshabilitar/habilitar el formulario al enviar también emite.
    this.loginForm.valueChanges
      .pipe(
        map(() => JSON.stringify(this.loginForm.getRawValue())),
        distinctUntilChanged(),
      )
      .subscribe(() => this.credentialsFailed.set(false));
    if (this.route.snapshot.queryParamMap.get('expired') === '1') {
      this.toast.info(
        'Sesión expirada',
        'Tu sesión expiró por inactividad. Inicia sesión de nuevo para continuar.',
      );
    }
  }

  /** Para llevar el correo escrito al registro, si ya es válido. */
  get registerQuery(): { email?: string } {
    const email = this.emailControl.value?.trim();
    return email && this.emailControl.valid ? { email } : {};
  }

  /** Aviso flotante y, en la tarjeta, la invitación a registrarse. */
  private showCredentialsError(): void {
    this.credentialsFailed.set(true);
    this.toast.error('No se pudo iniciar sesión', 'Correo o contraseña incorrectos.');
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
      return 'El correo electrónico es requerido';
    }
    if (ctrl.hasError('email') && ctrl.touched) {
      return 'Ingresa un correo electrónico válido';
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

  /** Mensaje del bloqueo temporal; incluye la hora de desbloqueo si el backend la informa. */
  private blockedMessage(blockedUntil: number): string {
    const until = new Date(blockedUntil * 1000);
    if (blockedUntil > 0 && until.getTime() > Date.now()) {
      const hour = until.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' });
      return `Demasiados intentos. Puedes intentar de nuevo a las ${hour}.`;
    }
    return 'Demasiados intentos. Espera unos minutos e intenta de nuevo.';
  }

  async onSubmit(): Promise<void> {
    this.loginForm.markAllAsTouched();

    if (this.loginForm.invalid) {
      return;
    }

    const { email, password } = this.loginForm.value;

    this.credentialsFailed.set(false);
    this.isLoading.set(true);
    this.loginForm.disable();

    try {
      const response = await this.authService.login({ email: email!, password: password! });

      if (response.is_definitively_blocked) {
        this.toast.error(
          'Cuenta bloqueada',
          'Tu cuenta fue bloqueada por seguridad. Contacta al administrador.',
        );
        return;
      }
      if (response.is_temporarily_blocked) {
        this.toast.error(
          'Cuenta bloqueada temporalmente',
          this.blockedMessage(response.blocked_until),
        );
        return;
      }
      if (response.is_successful && response.user_id) {
        this.toast.info('Verifica tu correo', 'Te enviamos un código para completar el ingreso.');
        await this.router.navigate(['/otp']);
        return;
      }

      this.showCredentialsError();
    } catch (error) {
      if (error instanceof Error && error.message === 'Credenciales inválidas') {
        this.showCredentialsError();
        return;
      }
      this.toast.error(
        'No se pudo iniciar sesión',
        error instanceof Error ? error.message : 'Error inesperado',
      );
    } finally {
      this.isLoading.set(false);
      this.loginForm.enable();
    }
  }
}