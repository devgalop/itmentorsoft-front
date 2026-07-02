import { TestBed } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { vi } from 'vitest';
import { ResetPasswordComponent } from './reset-password.component';
import { AuthService } from '../../../core/auth/auth.service';

describe('ResetPasswordComponent', () => {
  let authServiceMock: { resetPassword: ReturnType<typeof vi.fn> };

  // El componente lee token/trx del ActivatedRoute en el constructor, por eso
  // se instancia con un factory que inyecta los query params de cada caso.
  function createComponent(
    params: Record<string, string | null>,
  ): ResetPasswordComponent {
    const queryParamMap = {
      get: (key: string) => params[key] ?? null,
    };

    TestBed.configureTestingModule({
      imports: [ReactiveFormsModule],
      providers: [
        ResetPasswordComponent,
        { provide: AuthService, useValue: authServiceMock },
        { provide: ActivatedRoute, useValue: { snapshot: { queryParamMap } } },
      ],
    });

    return TestBed.inject(ResetPasswordComponent);
  }

  const validParams = { token: 'token-from-email', trx: 'trx-abc-123' };

  beforeEach(() => {
    authServiceMock = { resetPassword: vi.fn() };
  });

  describe('link validation', () => {
    it('creates successfully with a valid link', () => {
      const component = createComponent(validParams);
      expect(component).toBeTruthy();
      expect(component.resetForm).toBeTruthy();
      expect(component.hasValidLink()).toBe(true);
    });

    it('hasValidLink is false when token is missing', () => {
      const component = createComponent({ token: null, trx: 'trx-abc-123' });
      expect(component.hasValidLink()).toBe(false);
    });

    it('hasValidLink is false when trx is missing', () => {
      const component = createComponent({ token: 'token-from-email', trx: null });
      expect(component.hasValidLink()).toBe(false);
    });
  });

  describe('password validation', () => {
    it('form is invalid when empty', () => {
      const component = createComponent(validParams);
      expect(component.resetForm.valid).toBe(false);
    });

    it('rejects a password shorter than 6 characters', () => {
      const component = createComponent(validParams);
      component.newPasswordControl.setValue('Ab1!');
      expect(component.newPasswordControl.hasError('minlength')).toBe(true);
    });

    it('rejects a password longer than 20 characters', () => {
      const component = createComponent(validParams);
      component.newPasswordControl.setValue('Abcdefghij1234567890!');
      expect(component.newPasswordControl.hasError('maxlength')).toBe(true);
    });

    it('rejects a password without a digit', () => {
      const component = createComponent(validParams);
      component.newPasswordControl.setValue('abcdef!');
      expect(component.newPasswordControl.hasError('noDigit')).toBe(true);
    });

    it('rejects a password without a letter', () => {
      const component = createComponent(validParams);
      component.newPasswordControl.setValue('123456!');
      expect(component.newPasswordControl.hasError('noLetter')).toBe(true);
    });

    it('rejects a password without a special character', () => {
      const component = createComponent(validParams);
      component.newPasswordControl.setValue('abcde1');
      expect(component.newPasswordControl.hasError('noSpecial')).toBe(true);
    });

    it('accepts a password that meets every rule', () => {
      const component = createComponent(validParams);
      component.newPasswordControl.setValue('NuevaClave1!');
      expect(component.newPasswordControl.valid).toBe(true);
    });

    it('flags mismatched passwords at group level', () => {
      const component = createComponent(validParams);
      component.newPasswordControl.setValue('NuevaClave1!');
      component.confirmPasswordControl.setValue('Otra1!');
      expect(component.resetForm.hasError('passwordsMismatch')).toBe(true);
    });

    it('is valid when both passwords match and meet the rules', () => {
      const component = createComponent(validParams);
      component.resetForm.setValue({
        newPassword: 'NuevaClave1!',
        confirmPassword: 'NuevaClave1!',
      });
      expect(component.resetForm.valid).toBe(true);
    });
  });

  describe('error messages', () => {
    it('getNewPasswordError returns the special-character message', () => {
      const component = createComponent(validParams);
      component.newPasswordControl.markAsTouched();
      component.newPasswordControl.setValue('abcde1');
      expect(component.getNewPasswordError()).toBe(
        'Debe incluir al menos un carácter especial',
      );
    });

    it('getNewPasswordError returns null when untouched', () => {
      const component = createComponent(validParams);
      component.newPasswordControl.setValue('');
      expect(component.getNewPasswordError()).toBeNull();
    });

    it('getConfirmPasswordError returns mismatch message when touched', () => {
      const component = createComponent(validParams);
      component.newPasswordControl.setValue('NuevaClave1!');
      component.confirmPasswordControl.setValue('Otra1!');
      component.confirmPasswordControl.markAsTouched();
      expect(component.getConfirmPasswordError()).toBe('Las contraseñas no coinciden');
    });
  });

  describe('onSubmit', () => {
    function fillValidForm(component: ResetPasswordComponent): void {
      component.resetForm.setValue({
        newPassword: 'NuevaClave1!',
        confirmPassword: 'NuevaClave1!',
      });
    }

    it('does not call resetPassword when the form is invalid', async () => {
      const component = createComponent(validParams);
      await component.onSubmit();
      expect(authServiceMock.resetPassword).not.toHaveBeenCalled();
      expect(component.newPasswordControl.touched).toBe(true);
    });

    it('does not call resetPassword when the link is invalid', async () => {
      const component = createComponent({ token: null, trx: null });
      fillValidForm(component);
      await component.onSubmit();
      expect(authServiceMock.resetPassword).not.toHaveBeenCalled();
    });

    it('calls resetPassword mapping trx to id_trx on valid submit', async () => {
      authServiceMock.resetPassword.mockResolvedValue({
        is_success: true,
        message: 'Password changed successfully',
      });
      const component = createComponent(validParams);
      fillValidForm(component);

      await component.onSubmit();

      expect(authServiceMock.resetPassword).toHaveBeenCalledWith({
        token: 'token-from-email',
        id_trx: 'trx-abc-123',
        new_password: 'NuevaClave1!',
      });
    });

    it('shows the success state when is_success is true', async () => {
      authServiceMock.resetPassword.mockResolvedValue({
        is_success: true,
        message: 'Password changed successfully',
      });
      const component = createComponent(validParams);
      fillValidForm(component);

      await component.onSubmit();

      expect(component.success()).toBe(true);
      expect(component.serverError()).toBeNull();
    });

    it('shows an error when is_success is false (invalid/expired token)', async () => {
      authServiceMock.resetPassword.mockResolvedValue({
        is_success: false,
        message: 'Invalid or expired token',
      });
      const component = createComponent(validParams);
      fillValidForm(component);

      await component.onSubmit();

      expect(component.success()).toBe(false);
      expect(component.serverError()).toBe('Invalid or expired token');
      expect(component.resetForm.enabled).toBe(true);
    });

    it('shows the mapped error message when resetPassword throws', async () => {
      authServiceMock.resetPassword.mockRejectedValue(new Error('Sin conexión al servidor'));
      const component = createComponent(validParams);
      fillValidForm(component);

      await component.onSubmit();

      expect(component.serverError()).toBe('Sin conexión al servidor');
      expect(component.success()).toBe(false);
    });

    it('toggles loading state around the submit', async () => {
      authServiceMock.resetPassword.mockResolvedValue({
        is_success: true,
        message: 'ok',
      });
      const component = createComponent(validParams);
      fillValidForm(component);

      expect(component.isLoading()).toBe(false);
      const submitPromise = component.onSubmit();
      expect(component.isLoading()).toBe(true);
      expect(component.resetForm.disabled).toBe(true);

      await submitPromise;

      expect(component.isLoading()).toBe(false);
    });
  });
});
