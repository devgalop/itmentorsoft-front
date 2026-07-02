import { TestBed } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { vi } from 'vitest';
import { LoginComponent } from './login.component';
import { AuthService } from '../../../core/auth/auth.service';

describe('LoginComponent', () => {
  let component: LoginComponent;
  let authServiceMock: { login: ReturnType<typeof vi.fn>; role: ReturnType<typeof vi.fn> };
  let routerMock: { navigate: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    authServiceMock = { login: vi.fn(), role: vi.fn().mockReturnValue(null) };
    routerMock = { navigate: vi.fn() };

    TestBed.configureTestingModule({
      imports: [ReactiveFormsModule],
      providers: [
        LoginComponent,
        { provide: AuthService, useValue: authServiceMock },
        { provide: Router, useValue: routerMock },
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
    authServiceMock.login.mockResolvedValue(undefined);
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

  it('on successful login, redirects to role-specific route', async () => {
    authServiceMock.login.mockResolvedValue(undefined);
    authServiceMock.role.mockReturnValue('student');
    component.loginForm.setValue({
      email: 'test@example.com',
      password: 'password123',
    });

    await component.onSubmit();

    expect(routerMock.navigate).toHaveBeenCalledWith(['/student']);
  });

  it('on successful login with admin role, redirects to /admin', async () => {
    authServiceMock.login.mockResolvedValue(undefined);
    authServiceMock.role.mockReturnValue('admin');
    component.loginForm.setValue({
      email: 'test@example.com',
      password: 'password123',
    });

    await component.onSubmit();

    expect(routerMock.navigate).toHaveBeenCalledWith(['/admin']);
  });

  it('on successful login with teacher role, redirects to /teacher', async () => {
    authServiceMock.login.mockResolvedValue(undefined);
    authServiceMock.role.mockReturnValue('teacher');
    component.loginForm.setValue({
      email: 'test@example.com',
      password: 'password123',
    });

    await component.onSubmit();

    expect(routerMock.navigate).toHaveBeenCalledWith(['/teacher']);
  });

  it('on successful login with unknown role, redirects to /', async () => {
    authServiceMock.login.mockResolvedValue(undefined);
    authServiceMock.role.mockReturnValue('user');
    component.loginForm.setValue({
      email: 'test@example.com',
      password: 'password123',
    });

    await component.onSubmit();

    expect(routerMock.navigate).toHaveBeenCalledWith(['/']);
  });

  it('on 401 error, shows error message', async () => {
    authServiceMock.login.mockRejectedValue(new Error('Credenciales inválidas'));
    component.loginForm.setValue({
      email: 'test@example.com',
      password: 'password123',
    });

    await component.onSubmit();

    expect(component.serverError()).toBe('Credenciales inválidas');
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
    authServiceMock.login.mockResolvedValue(undefined);
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