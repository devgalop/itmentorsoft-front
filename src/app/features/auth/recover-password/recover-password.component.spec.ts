import { TestBed } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { vi } from 'vitest';
import { RecoverPasswordComponent } from './recover-password.component';
import { AuthService } from '../../../core/auth/auth.service';
import { ToastService } from '../../../shared/ui/toast/toast.service';

describe('RecoverPasswordComponent', () => {
  let component: RecoverPasswordComponent;
  let authServiceMock: { recoverPassword: ReturnType<typeof vi.fn> };
  let toastMock: { success: ReturnType<typeof vi.fn>; error: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    authServiceMock = { recoverPassword: vi.fn() };
    toastMock = { success: vi.fn(), error: vi.fn() };

    TestBed.configureTestingModule({
      imports: [ReactiveFormsModule],
      providers: [
        RecoverPasswordComponent,
        { provide: AuthService, useValue: authServiceMock },
        { provide: ToastService, useValue: toastMock },
      ],
    });

    component = TestBed.inject(RecoverPasswordComponent);
  });

  it('creates successfully', () => {
    expect(component).toBeTruthy();
    expect(component.recoverForm).toBeTruthy();
  });

  it('form is invalid with empty email', () => {
    expect(component.recoverForm.valid).toBe(false);
  });

  it('form is valid with correct email format', () => {
    component.recoverForm.setValue({ email: 'test@example.com' });
    expect(component.recoverForm.valid).toBe(true);
  });

  it('email validation rejects invalid format', () => {
    component.emailControl.setValue('not-an-email');
    expect(component.emailControl.hasError('email')).toBe(true);
  });

  it('getEmailError returns required message when empty and touched', () => {
    component.emailControl.markAsTouched();
    component.emailControl.setValue('');
    expect(component.getEmailError()).toBe('El email es requerido');
  });

  it('getEmailError returns format message when invalid and touched', () => {
    component.emailControl.markAsTouched();
    component.emailControl.setValue('not-an-email');
    expect(component.getEmailError()).toBe('Ingresá un email válido');
  });

  it('getEmailError returns null when untouched', () => {
    component.emailControl.setValue('');
    expect(component.getEmailError()).toBeNull();
  });

  describe('onSubmit', () => {
    it('marks email as touched on invalid submit', async () => {
      expect(component.emailControl.touched).toBe(false);
      await component.onSubmit();
      expect(component.emailControl.touched).toBe(true);
    });

    it('does not call AuthService.recoverPassword() when form is invalid', async () => {
      await component.onSubmit();
      expect(authServiceMock.recoverPassword).not.toHaveBeenCalled();
    });

    it('calls AuthService.recoverPassword() with correct payload on valid submit', async () => {
      authServiceMock.recoverPassword.mockResolvedValue({
        message: 'If the email exists in our system, you will receive a password recovery email shortly.',
      });
      component.recoverForm.setValue({ email: 'test@example.com' });

      await component.onSubmit();

      expect(authServiceMock.recoverPassword).toHaveBeenCalledWith({ email: 'test@example.com' });
    });

    it('sets submitted and shows a success toast on success', async () => {
      authServiceMock.recoverPassword.mockResolvedValue({ message: 'ok' });
      component.recoverForm.setValue({ email: 'test@example.com' });

      await component.onSubmit();

      expect(component.submitted()).toBe(true);
      expect(toastMock.success).toHaveBeenCalledWith(
        'Solicitud enviada',
        'Si el correo existe, te enviamos un enlace para restablecer tu contraseña.',
        6000,
      );
    });

    it('shows an error toast when recoverPassword() throws', async () => {
      authServiceMock.recoverPassword.mockRejectedValue(new Error('Sin conexión al servidor'));
      component.recoverForm.setValue({ email: 'test@example.com' });

      await component.onSubmit();

      expect(toastMock.error).toHaveBeenCalledWith(
        'No se pudo enviar la solicitud',
        'Sin conexión al servidor',
      );
      expect(component.submitted()).toBe(false);
    });

    it('resets loading state after submit completes', async () => {
      authServiceMock.recoverPassword.mockResolvedValue({ message: 'ok' });
      component.recoverForm.setValue({ email: 'test@example.com' });

      expect(component.isLoading()).toBe(false);
      const submitPromise = component.onSubmit();
      expect(component.isLoading()).toBe(true);
      expect(component.recoverForm.disabled).toBe(true);

      await submitPromise;

      expect(component.isLoading()).toBe(false);
      expect(component.recoverForm.enabled).toBe(true);
    });

    it('fires a success toast on each successful submit', async () => {
      authServiceMock.recoverPassword.mockResolvedValue({ message: 'ok' });
      component.recoverForm.setValue({ email: 'test@example.com' });

      await component.onSubmit();
      await component.onSubmit();

      expect(toastMock.success).toHaveBeenCalledTimes(2);
      expect(component.submitted()).toBe(true);
    });
  });
});