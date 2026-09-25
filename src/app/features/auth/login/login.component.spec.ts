import { TestBed } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { vi } from 'vitest';
import { LoginComponent } from './login.component';
import { AuthService } from '../../../core/auth/auth.service';
import { ToastService } from '../../../shared/ui/toast/toast.service';

describe('LoginComponent', () => {
  let component: LoginComponent;
  let authServiceMock: { login: ReturnType<typeof vi.fn>; role: ReturnType<typeof vi.fn> };
  let routerMock: { navigate: ReturnType<typeof vi.fn> };
  let toastMock: {
    success: ReturnType<typeof vi.fn>;
    error: ReturnType<typeof vi.fn>;
    info: ReturnType<typeof vi.fn>;
  };

  const SUCCESS = {
    is_successful: true,
    user_id: 'u1',
    is_temporarily_blocked: false,
    blocked_until: 0,
    is_definitively_blocked: false,
  };

  beforeEach(() => {
    authServiceMock = { login: vi.fn(), role: vi.fn().mockReturnValue(null) };
    routerMock = { navigate: vi.fn() };
    toastMock = { success: vi.fn(), error: vi.fn(), info: vi.fn() };

    TestBed.configureTestingModule({
      imports: [ReactiveFormsModule],
      providers: [
        LoginComponent,
        { provide: AuthService, useValue: authServiceMock },
        { provide: Router, useValue: routerMock },
        { provide: ToastService, useValue: toastMock },
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { queryParamMap: { get: () => null } } },
        },
      ],
    });

    component = TestBed.inject(LoginComponent);
  });

  it('creates successfully', () => {
    expect(component).toBeTruthy();
    expect(component.loginForm).toBeTruthy();
  });

  it('form is invalid with empty fields', () => {
    expect(component.loginForm.valid).toBe(false);
  });

  it('form is valid with correct email and password (min 6 chars)', () => {
    component.loginForm.setValue({
      email: 'test@example.com',
      password: 'password123',
    });
    expect(component.loginForm.valid).toBe(true);
  });

  it('email validation rejects invalid format', () => {
    component.emailControl.setValue('not-an-email');
    expect(component.emailControl.hasError('email')).toBe(true);
  });

  it('on submit with invalid form, marks all as touched', () => {
    expect(component.emailControl.touched).toBe(false);
    expect(component.passwordControl.touched).toBe(false);

    component.onSubmit();

    expect(component.emailControl.touched).toBe(true);
    expect(component.passwordControl.touched).toBe(true);
  });

  it('on submit with invalid form, does not call AuthService.login()', async () => {
    await component.onSubmit();
    expect(authServiceMock.login).not.toHaveBeenCalled();
  });

  it('on successful login, calls AuthService.login()', async () => {
    authServiceMock.login.mockResolvedValue(SUCCESS);
    component.loginForm.setValue({
      email: 'test@example.com',
      password: 'password123',
    });

    await component.onSubmit();

    expect(authServiceMock.login).toHaveBeenCalledWith({
      email: 'test@example.com',
      password: 'password123',
    });
  });

  it('on successful login (step 1), navigates to /otp for the code', async () => {
    authServiceMock.login.mockResolvedValue(SUCCESS);
    component.loginForm.setValue({
      email: 'test@example.com',
      password: 'password123',
    });

    await component.onSubmit();

    expect(routerMock.navigate).toHaveBeenCalledWith(['/otp']);
  });

  it('does not navigate to /otp when the account is temporarily blocked', async () => {
    authServiceMock.login.mockResolvedValue({
      is_successful: false,
      user_id: 'u1',
      is_temporarily_blocked: true,
      blocked_until: 999,
      is_definitively_blocked: false,
    });
    component.loginForm.setValue({ email: 'test@example.com', password: 'password123' });

    await component.onSubmit();

    expect(routerMock.navigate).not.toHaveBeenCalled();
    expect(toastMock.error).toHaveBeenCalled();
  });

  it('does not navigate when the account is definitively blocked', async () => {
    authServiceMock.login.mockResolvedValue({
      is_successful: false,
      user_id: 'u1',
      is_temporarily_blocked: false,
      blocked_until: 0,
      is_definitively_blocked: true,
    });
    component.loginForm.setValue({ email: 'test@example.com', password: 'password123' });

    await component.onSubmit();

    expect(routerMock.navigate).not.toHaveBeenCalled();
    expect(toastMock.error).toHaveBeenCalled();
  });

  it('on 401 error, shows an error toast', async () => {
    authServiceMock.login.mockRejectedValue(new Error('Credenciales inválidas'));
    component.loginForm.setValue({
      email: 'test@example.com',
      password: 'password123',
    });

    await component.onSubmit();

    expect(toastMock.error).toHaveBeenCalledWith('No se pudo iniciar sesión', 'Credenciales inválidas');
  });

  it('on error, does not redirect', async () => {
    authServiceMock.login.mockRejectedValue(new Error('Credenciales inválidas'));
    component.loginForm.setValue({
      email: 'test@example.com',
      password: 'password123',
    });

    await component.onSubmit();

    expect(routerMock.navigate).not.toHaveBeenCalled();
  });

  it('on successful login, resets loading state', async () => {
    authServiceMock.login.mockResolvedValue(SUCCESS);
    component.loginForm.setValue({
      email: 'test@example.com',
      password: 'password123',
    });

    expect(component.isLoading()).toBe(false);
    const submitPromise = component.onSubmit();
    expect(component.isLoading()).toBe(true);
    expect(component.loginForm.disabled).toBe(true);

    await submitPromise;

    expect(component.isLoading()).toBe(false);
    expect(component.loginForm.disabled).toBe(false);
  });

  it('password validation requires min 6 chars', () => {
    component.passwordControl.setValue('12345');
    expect(component.passwordControl.hasError('minlength')).toBe(true);
  });

  it('getEmailError returns required message when empty and touched', () => {
    component.emailControl.markAsTouched();
    component.emailControl.setValue('');
    expect(component.getEmailError()).toBe('El email es requerido');
  });

  it('getEmailError returns email format message when invalid and touched', () => {
    component.emailControl.markAsTouched();
    component.emailControl.setValue('not-an-email');
    expect(component.getEmailError()).toBe('Ingresá un email válido');
  });

  it('getPasswordError returns required message when empty and touched', () => {
    component.passwordControl.markAsTouched();
    component.passwordControl.setValue('');
    expect(component.getPasswordError()).toBe('La contraseña es requerida');
  });

  it('getPasswordError returns minlength message when too short and touched', () => {
    component.passwordControl.markAsTouched();
    component.passwordControl.setValue('12345');
    expect(component.getPasswordError()).toBe(
      'La contraseña debe tener al menos 6 caracteres',
    );
  });
});