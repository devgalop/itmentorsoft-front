import { TestBed } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { vi } from 'vitest';
import { RecoverPasswordComponent } from './recover-password.component';
import { AuthService } from '../../../core/auth/auth.service';

describe('RecoverPasswordComponent', () => {
  let component: RecoverPasswordComponent;
  let authServiceMock: { recoverPassword: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    authServiceMock = { recoverPassword: vi.fn() };

    TestBed.configureTestingModule({
      imports: [ReactiveFormsModule],
      providers: [
        RecoverPasswordComponent,
        { provide: AuthService, useValue: authServiceMock },
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

    it('shows success message with the backend response on success', async () => {
      const backendMessage = 'If the email exists in our system, you will receive a password recovery email shortly.';
      authServiceMock.recoverPassword.mockResolvedValue({ message: backendMessage });
      component.recoverForm.setValue({ email: 'test@example.com' });

      await component.onSubmit();

      expect(component.successMessage()).toBe(backendMessage);
      expect(component.serverError()).toBeNull();
    });

    it('shows error message when recoverPassword() throws (network/validation error)', async () => {
      authServiceMock.recoverPassword.mockRejectedValue(new Error('Sin conexión al servidor'));
      component.recoverForm.setValue({ email: 'test@example.com' });

      await component.onSubmit();

      expect(component.serverError()).toBe('Sin conexión al servidor');
      expect(component.successMessage()).toBeNull();
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

    it('clears previous messages on new submit attempt', async () => {
      authServiceMock.recoverPassword.mockResolvedValue({ message: 'first message' });
      component.recoverForm.setValue({ email: 'test@example.com' });
      await component.onSubmit();
      expect(component.successMessage()).toBe('first message');

      authServiceMock.recoverPassword.mockRejectedValue(new Error('Sin conexión al servidor'));
      await component.onSubmit();

      expect(component.successMessage()).toBeNull();
      expect(component.serverError()).toBe('Sin conexión al servidor');
    });
  });
});