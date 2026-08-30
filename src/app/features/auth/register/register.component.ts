import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import {
  ReactiveFormsModule,
  FormControl,
  FormGroup,
  Validators,
  AbstractControl,
  ValidationErrors,
} from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '@core/auth/auth.service';
import { ToastService } from '@shared/ui/toast/toast.service';
import { InputComponent, ButtonComponent, FormFieldComponent } from '@shared/ui';

/** Mismo set de caracteres especiales que valida el backend. */
const SPECIAL_CHAR = /[!@#$%^&*()_+\-=\[\]{}|;':",.<>/?]/;

interface PasswordRule {
  readonly key: string;
  readonly label: string;
  readonly test: (value: string) => boolean;
}

/** Reglas de contraseña, replicando exactamente las del backend (create_user). */
const PASSWORD_RULES: readonly PasswordRule[] = [
  { key: 'length', label: 'Entre 6 y 20 caracteres', test: (v) => v.length >= 6 && v.length <= 20 },
  { key: 'letter', label: 'Al menos una letra', test: (v) => /[a-zA-Z]/.test(v) },
  { key: 'digit', label: 'Al menos un número', test: (v) => /\d/.test(v) },
  {
    key: 'special',
    label: 'Al menos un carácter especial (!@#$%…)',
    test: (v) => SPECIAL_CHAR.test(v),
  },
];

/** Valida que la contraseña cumpla todas las reglas del backend. */
function passwordStrengthValidator(control: AbstractControl): ValidationErrors | null {
  const value: string = control.value ?? '';
  if (!value) {
    return null; // el 'required' lo maneja Validators.required
  }
  const failed = PASSWORD_RULES.filter((rule) => !rule.test(value)).map((rule) => rule.key);
  return failed.length ? { passwordStrength: failed } : null;
}

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
  private readonly toast = inject(ToastService);

  readonly registerForm = new FormGroup({
    username: new FormControl('', [
      Validators.required,
      Validators.minLength(3),
      Validators.maxLength(20),
      Validators.pattern(/^\w+$/),
    ]),
    email: new FormControl('', [Validators.required, Validators.email]),
    password: new FormControl('', [Validators.required, passwordStrengthValidator]),
    confirmPassword: new FormControl('', [Validators.required]),
  });

  readonly isLoading = signal(false);

  /** Valor actual de la contraseña, como señal, para el checklist en vivo. */
  private readonly passwordValue = toSignal(this.registerForm.controls.password.valueChanges, {
    initialValue: '',
  });

  /** Estado de cada regla de contraseña (para pintarlas en verde al cumplirse). */
  readonly passwordChecks = computed(() => {
    const value = this.passwordValue() ?? '';
    return PASSWORD_RULES.map((rule) => ({ label: rule.label, met: rule.test(value) }));
  });

  /** El checklist aparece en cuanto el usuario empieza a escribir. */
  readonly showPasswordChecks = computed(() => (this.passwordValue() ?? '').length > 0);

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
    // El detalle de reglas lo muestra el checklist; aquí solo el 'requerido'.
    if (!ctrl.touched) return null;
    if (ctrl.hasError('required')) return 'La contraseña es requerida';
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
        this.toast.success('Cuenta creada', 'Ya podés iniciar sesión.');
        setTimeout(() => this.router.navigate(['/login']), 1500);
      } else {
        this.toast.error('No se pudo crear la cuenta', response.message);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Error inesperado';
      this.toast.error('No se pudo crear la cuenta', message);
    } finally {
      this.isLoading.set(false);
      this.registerForm.enable();
    }
  }
}
