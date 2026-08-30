import { TestBed } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { vi } from 'vitest';
import { RegisterComponent } from './register.component';
import { AuthService } from '../../../core/auth/auth.service';
import { ToastService } from '../../../shared/ui/toast/toast.service';

describe('RegisterComponent', () => {
  let component: RegisterComponent;
  let authServiceMock: { register: ReturnType<typeof vi.fn> };
  let routerMock: { navigate: ReturnType<typeof vi.fn> };
  let toastMock: { success: ReturnType<typeof vi.fn>; error: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    vi.useFakeTimers();
    authServiceMock = { register: vi.fn() };
    routerMock = { navigate: vi.fn() };
    toastMock = { success: vi.fn(), error: vi.fn() };

    TestBed.configureTestingModule({
      imports: [ReactiveFormsModule],
      providers: [
        RegisterComponent,
        { provide: AuthService, useValue: authServiceMock },
        { provide: Router, useValue: routerMock },
        { provide: ToastService, useValue: toastMock },
      ],
    });

    component = TestBed.inject(RegisterComponent);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('creates successfully', () => {
    expect(component).toBeTruthy();
    expect(component.registerForm).toBeTruthy();
  });

  it('form is invalid with empty fields', () => {
    expect(component.registerForm.valid).toBe(false);
  });

  it('form is valid with correct data and matching passwords', () => {
    component.registerForm.setValue({
      username: 'juan_test',
      email: 'juan@test.com',
      password: 'Password123!',
      confirmPassword: 'Password123!',
    });
    expect(component.registerForm.valid).toBe(true);
  });

  describe('username validation', () => {
    it('rejects username shorter than 3 characters', () => {
      component.usernameControl.setValue('ab');
      expect(component.usernameControl.hasError('minlength')).toBe(true);
    });

    it('rejects username with special characters', () => {
      component.usernameControl.setValue('juan-test!');
      expect(component.usernameControl.hasError('pattern')).toBe(true);
    });

    it('accepts username with underscore', () => {
      component.usernameControl.setValue('juan_test');
      expect(component.usernameControl.valid).toBe(true);
    });
  });

  describe('email validation', () => {
    it('rejects invalid email format', () => {
      component.emailControl.setValue('not-an-email');
      expect(component.emailControl.hasError('email')).toBe(true);
    });
  });

  describe('password validation', () => {
    it('rejects a password that only has digits (no letter/special)', () => {
      component.passwordControl.setValue('123456');
      expect(component.passwordControl.hasError('passwordStrength')).toBe(true);
    });

    it('rejects a password shorter than 6 characters', () => {
      component.passwordControl.setValue('Ab1!');
      expect(component.passwordControl.hasError('passwordStrength')).toBe(true);
    });

    it('accepts a password that meets every rule', () => {
      component.passwordControl.setValue('Password123!');
      expect(component.passwordControl.valid).toBe(true);
    });
  });

  describe('password checklist', () => {
    it('is hidden until the user types', () => {
      expect(component.showPasswordChecks()).toBe(false);
    });

    it('marks each rule as met for a strong password', () => {
      component.passwordControl.setValue('Password123!');
      expect(component.showPasswordChecks()).toBe(true);
      expect(component.passwordChecks().every((c) => c.met)).toBe(true);
    });

    it('leaves letter/special unmet for a digits-only password', () => {
      component.passwordControl.setValue('123456');
      const byLabel = (frag: string) =>
        component.passwordChecks().find((c) => c.label.includes(frag))!;
      expect(byLabel('número').met).toBe(true);
      expect(byLabel('letra').met).toBe(false);
      expect(byLabel('especial').met).toBe(false);
    });
  });

  describe('confirmPassword validation', () => {
    it('getConfirmPasswordError returns mismatch message when passwords differ', () => {
      component.passwordControl.setValue('Password123!');
      component.confirmPasswordControl.setValue('Different123!');
      component.confirmPasswordControl.markAsTouched();
      expect(component.getConfirmPasswordError()).toBe('Las contraseñas no coinciden');
    });

    it('getConfirmPasswordError returns null when passwords match', () => {
      component.passwordControl.setValue('Password123!');
      component.confirmPasswordControl.setValue('Password123!');
      component.confirmPasswordControl.markAsTouched();
      expect(component.getConfirmPasswordError()).toBeNull();
    });
  });

  describe('onSubmit', () => {
    const validFormData = {
      username: 'juan_test',
      email: 'juan@test.com',
      password: 'Password123!',
      confirmPassword: 'Password123!',
    };

    it('marks all fields as touched on invalid submit', async () => {
      await component.onSubmit();
      expect(component.usernameControl.touched).toBe(true);
      expect(component.emailControl.touched).toBe(true);
    });

    it('does not call AuthService.register() when form is invalid', async () => {
      await component.onSubmit();
      expect(authServiceMock.register).not.toHaveBeenCalled();
    });

    it('does not call AuthService.register() when passwords do not match', async () => {
      component.registerForm.setValue({ ...validFormData, confirmPassword: 'Different123!' });
      await component.onSubmit();
      expect(authServiceMock.register).not.toHaveBeenCalled();
    });

    it('calls AuthService.register() with correct payload on valid submit', async () => {
      authServiceMock.register.mockResolvedValue({
        is_success: true,
        message: 'User created successfully',
        user_id: 'abc123',
      });
      component.registerForm.setValue(validFormData);

      await component.onSubmit();

      expect(authServiceMock.register).toHaveBeenCalledWith({
        username: 'juan_test',
        email: 'juan@test.com',
        password: 'Password123!',
      });
    });

    it('shows a success toast and redirects to /login after delay on is_success true', async () => {
      authServiceMock.register.mockResolvedValue({
        is_success: true,
        message: 'User created successfully',
        user_id: 'abc123',
      });
      component.registerForm.setValue(validFormData);

      await component.onSubmit();

      expect(toastMock.success).toHaveBeenCalledWith('Cuenta creada', 'Ya podés iniciar sesión.');
      expect(routerMock.navigate).not.toHaveBeenCalled();

      vi.advanceTimersByTime(1500);

      expect(routerMock.navigate).toHaveBeenCalledWith(['/login']);
    });

    it('shows an error toast with the backend message when is_success is false', async () => {
      authServiceMock.register.mockResolvedValue({
        is_success: false,
        message: 'Este correo ya está registrado',
        user_id: null,
      });
      component.registerForm.setValue(validFormData);

      await component.onSubmit();

      expect(toastMock.error).toHaveBeenCalledWith(
        'No se pudo crear la cuenta',
        'Este correo ya está registrado',
      );
      expect(toastMock.success).not.toHaveBeenCalled();
    });

    it('shows an error toast when register() throws', async () => {
      authServiceMock.register.mockRejectedValue(new Error('Sin conexión al servidor'));
      component.registerForm.setValue(validFormData);

      await component.onSubmit();

      expect(toastMock.error).toHaveBeenCalledWith(
        'No se pudo crear la cuenta',
        'Sin conexión al servidor',
      );
    });

    it('resets loading state after submit completes', async () => {
      authServiceMock.register.mockResolvedValue({
        is_success: true,
        message: 'ok',
        user_id: 'abc',
      });
      component.registerForm.setValue(validFormData);

      expect(component.isLoading()).toBe(false);
      const submitPromise = component.onSubmit();
      expect(component.isLoading()).toBe(true);
      expect(component.registerForm.disabled).toBe(true);

      await submitPromise;

      expect(component.isLoading()).toBe(false);
      expect(component.registerForm.enabled).toBe(true);
    });
  });
});
