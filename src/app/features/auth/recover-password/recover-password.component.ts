import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { ReactiveFormsModule, FormControl, FormGroup, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthService } from '@core/auth/auth.service';
import { ToastService } from '@shared/ui/toast/toast.service';
import { InputComponent, ButtonComponent, FormFieldComponent } from '@shared/ui';

@Component({
  selector: 'app-recover-password',
  standalone: true,
  imports: [ReactiveFormsModule, InputComponent, ButtonComponent, FormFieldComponent, RouterLink],
  templateUrl: './recover-password.component.html',
  styleUrl: './recover-password.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RecoverPasswordComponent {
  private readonly authService = inject(AuthService);
  private readonly toast = inject(ToastService);

  readonly recoverForm = new FormGroup({
    email: new FormControl('', [Validators.required, Validators.email]),
  });

  readonly isLoading = signal(false);
  /** Se envió la solicitud correctamente (para mostrar la confirmación en pantalla). */
  readonly submitted = signal(false);

  get emailControl(): FormControl {
    return this.recoverForm.get('email') as FormControl;
  }

  getEmailError(): string | null {
    const ctrl = this.emailControl;
    if (!ctrl.touched) return null;
    if (ctrl.hasError('required')) return 'El email es requerido';
    if (ctrl.hasError('email')) return 'Ingresá un email válido';
    return null;
  }

  async onSubmit(): Promise<void> {
    this.recoverForm.markAllAsTouched();

    if (this.recoverForm.invalid) {
      return;
    }

    const { email } = this.recoverForm.value;

    this.isLoading.set(true);
    this.recoverForm.disable();

    try {
      await this.authService.recoverPassword({ email: email! });
      this.submitted.set(true);
      this.toast.success(
        'Solicitud enviada',
        'Si el correo existe, te enviamos un enlace para restablecer tu contraseña.',
        6000,
      );
    } catch (error) {
      this.toast.error(
        'No se pudo enviar la solicitud',
        error instanceof Error ? error.message : 'Error inesperado',
      );
    } finally {
      this.isLoading.set(false);
      this.recoverForm.enable();
    }
  }
}