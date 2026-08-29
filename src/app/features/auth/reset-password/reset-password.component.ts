import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import {
  ReactiveFormsModule,
  FormControl,
  FormGroup,
  Validators,
  AbstractControl,
  ValidationErrors,
} from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { AuthService } from '@core/auth/auth.service';
import { ToastService } from '@shared/ui/toast/toast.service';
import { InputComponent, ButtonComponent, FormFieldComponent } from '@shared/ui';

// Mismo conjunto de caracteres especiales que exige el backend
// (change_password_request.py -> SPECIAL_CHAR_PATTERN).
const SPECIAL_CHAR = /[!@#$%^&*()_+\-=\[\]{}|;':",.<>\/?]/;

/** Réplica de las reglas de contraseña del backend: 1 dígito, 1 letra, 1 carácter especial. */
function passwordStrengthValidator(control: AbstractControl): ValidationErrors | null {
  const value = control.value as string;
  if (!value) {
    return null;
  }
  const errors: ValidationErrors = {};
  if (!/\d/.test(value)) {
    errors['noDigit'] = true;
  }
  if (!/[a-zA-Z]/.test(value)) {
    errors['noLetter'] = true;
  }
  if (!SPECIAL_CHAR.test(value)) {
    errors['noSpecial'] = true;
  }
  return Object.keys(errors).length ? errors : null;
}

/** Valida que newPassword y confirmPassword coincidan (validador a nivel de grupo). */
function passwordsMatchValidator(group: AbstractControl): ValidationErrors | null {
  const password = group.get('newPassword')?.value;
  const confirm = group.get('confirmPassword')?.value;
  if (!confirm) {
    return null;
  }
  return password === confirm ? null : { passwordsMismatch: true };
}

@Component({
  selector: 'app-reset-password',
  standalone: true,
  imports: [ReactiveFormsModule, InputComponent, ButtonComponent, FormFieldComponent, RouterLink],
  templateUrl: './reset-password.component.html',
  styleUrl: './reset-password.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ResetPasswordComponent {
  private readonly authService = inject(AuthService);
  private readonly route = inject(ActivatedRoute);
  private readonly toast = inject(ToastService);

  // El link del correo llega como /reset-password?token=...&trx=...
  // Ojo: en la URL el parámetro se llama `trx`, pero el endpoint espera `id_trx`.
  private readonly token = this.route.snapshot.queryParamMap.get('token');
  private readonly trx = this.route.snapshot.queryParamMap.get('trx');

  readonly hasValidLink = signal<boolean>(!!this.token && !!this.trx);

  readonly resetForm = new FormGroup(
    {
      newPassword: new FormControl('', [
        Validators.required,
        Validators.minLength(6),
        Validators.maxLength(20),
        passwordStrengthValidator,
      ]),
      confirmPassword: new FormControl('', [Validators.required]),
    },
    { validators: passwordsMatchValidator },
  );

  readonly isLoading = signal(false);
  readonly success = signal(false);

  get newPasswordControl(): FormControl {
    return this.resetForm.get('newPassword') as FormControl;
  }

  get confirmPasswordControl(): FormControl {
    return this.resetForm.get('confirmPassword') as FormControl;
  }

  getNewPasswordError(): string | null {
    const ctrl = this.newPasswordControl;
    if (!ctrl.touched) return null;
    if (ctrl.hasError('required')) return 'La contraseña es requerida';
    if (ctrl.hasError('minlength')) return 'Debe tener al menos 6 caracteres';
    if (ctrl.hasError('maxlength')) return 'No puede superar los 20 caracteres';
    if (ctrl.hasError('noDigit')) return 'Debe incluir al menos un número';
    if (ctrl.hasError('noLetter')) return 'Debe incluir al menos una letra';
    if (ctrl.hasError('noSpecial')) return 'Debe incluir al menos un carácter especial';
    return null;
  }

  getConfirmPasswordError(): string | null {
    const ctrl = this.confirmPasswordControl;
    if (ctrl.hasError('required') && ctrl.touched) return 'Confirmá la contraseña';
    if (this.resetForm.hasError('passwordsMismatch') && ctrl.touched) {
      return 'Las contraseñas no coinciden';
    }
    return null;
  }

  async onSubmit(): Promise<void> {
    this.resetForm.markAllAsTouched();

    if (this.resetForm.invalid || !this.token || !this.trx) {
      return;
    }

    const newPassword = this.resetForm.value.newPassword!;

    this.isLoading.set(true);
    this.resetForm.disable();

    try {
      const response = await this.authService.resetPassword({
        token: this.token,
        id_trx: this.trx,
        new_password: newPassword,
      });

      if (response.is_success) {
        this.success.set(true);
      } else {
        // Token inválido/expirado -> el backend responde 200 con is_success=false.
        this.toast.error(
          'No se pudo cambiar la contraseña',
          this.authService.translateError(response.message || 'No se pudo cambiar la contraseña'),
        );
        this.resetForm.enable();
      }
    } catch (error) {
      this.toast.error(
        'No se pudo cambiar la contraseña',
        error instanceof Error ? this.authService.translateError(error.message) : 'Error inesperado',
      );
      this.resetForm.enable();
    } finally {
      this.isLoading.set(false);
    }
  }
}
