import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { ReactiveFormsModule, FormControl, FormGroup, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '@core/auth/auth.service';
import { InputComponent, ButtonComponent, FormFieldComponent } from '@shared/ui';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [ReactiveFormsModule, InputComponent, ButtonComponent, FormFieldComponent, RouterLink],
  templateUrl: './register.component.html',
  styleUrl: './register.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RegisterComponent {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  readonly registerForm = new FormGroup({
    username: new FormControl('', [
      Validators.required,
      Validators.minLength(3),
      Validators.maxLength(20),
      Validators.pattern(/^\w+$/),
    ]),
    email: new FormControl('', [Validators.required, Validators.email]),
    password: new FormControl('', [Validators.required, Validators.minLength(6)]),
    confirmPassword: new FormControl('', [Validators.required]),
  });

  readonly isLoading = signal(false);
  readonly serverError = signal<string | null>(null);
  readonly successMessage = signal<string | null>(null);

  get usernameControl(): FormControl {
    return this.registerForm.get('username') as FormControl;
  }

  get emailControl(): FormControl {
    return this.registerForm.get('email') as FormControl;
  }

  get passwordControl(): FormControl {
    return this.registerForm.get('password') as FormControl;
  }

  get confirmPasswordControl(): FormControl {
    return this.registerForm.get('confirmPassword') as FormControl;
  }

  getUsernameError(): string | null {
    const ctrl = this.usernameControl;
    if (!ctrl.touched) return null;
    if (ctrl.hasError('required')) return 'El nombre de usuario es requerido';
    if (ctrl.hasError('minlength')) return 'Mínimo 3 caracteres';
    if (ctrl.hasError('maxlength')) return 'Máximo 20 caracteres';
    if (ctrl.hasError('pattern')) return 'Solo letras, números y guion bajo';
    return null;
  }

  getEmailError(): string | null {
    const ctrl = this.emailControl;
    if (!ctrl.touched) return null;
    if (ctrl.hasError('required')) return 'El email es requerido';
    if (ctrl.hasError('email')) return 'Ingresá un email válido';
    return null;
  }

  getPasswordError(): string | null {
    const ctrl = this.passwordControl;
    if (!ctrl.touched) return null;
    if (ctrl.hasError('required')) return 'La contraseña es requerida';
    if (ctrl.hasError('minlength')) return 'Mínimo 6 caracteres';
    return null;
  }

  getConfirmPasswordError(): string | null {
    const ctrl = this.confirmPasswordControl;
    if (!ctrl.touched) return null;
    if (ctrl.hasError('required')) return 'Confirmá tu contraseña';
    if (this.passwordsDoNotMatch()) return 'Las contraseñas no coinciden';
    return null;
  }

  private passwordsDoNotMatch(): boolean {
    const password = this.passwordControl.value;
    const confirmPassword = this.confirmPasswordControl.value;
    return !!confirmPassword && password !== confirmPassword;
  }

  async onSubmit(): Promise<void> {
    this.serverError.set(null);
    this.successMessage.set(null);
    this.registerForm.markAllAsTouched();

    if (this.registerForm.invalid || this.passwordsDoNotMatch()) {
      return;
    }

    const { username, email, password } = this.registerForm.value;

    this.isLoading.set(true);
    this.registerForm.disable();

    try {
      const response = await this.authService.register({
        username: username!,
        email: email!,
        password: password!,
      });

      if (response.is_success) {
        this.successMessage.set('Cuenta creada exitosamente. Ya podés iniciar sesión.');
        setTimeout(() => this.router.navigate(['/login']), 2000);
      } else {
        this.serverError.set(response.message);
      }
    } catch (error) {
      this.serverError.set(error instanceof Error ? error.message : 'Error inesperado');
    } finally {
      this.isLoading.set(false);
      this.registerForm.enable();
    }
  }
}