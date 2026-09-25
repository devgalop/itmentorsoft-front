import { TestBed } from '@angular/core/testing';
import {
  HttpClientTestingModule,
  HttpTestingController,
} from '@angular/common/http/testing';
import { Router } from '@angular/router';
import { AuthService } from './auth.service';
import { JwtService } from './jwt.service';
import { LoginResponse } from './auth.types';

describe('AuthService', () => {
  let service: AuthService;
  let httpMock: HttpTestingController;
  let router: Router;

  const apiUrl = '';
  const sessionUrl = `${apiUrl}/users/sessions`;
  const otpUrl = `${apiUrl}/users/otp/validate`;

  const VALID_STUDENT_TOKEN =
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX25hbWUiOiJlaWRlcl90ZXN0Iiwicm9sZSI6InN0dWRlbnQiLCJleHAiOjE3ODIxMDY5OTV9.C29WG-n07km4acqGC5yyh_GOTLFM03cbdYeZ7Y-T5pM';

  // Paso 1 (login): sin token, solo user_id.
  const mockResponse: LoginResponse = {
    is_successful: true,
    user_id: 'user-abc-123',
    is_temporarily_blocked: false,
    blocked_until: 0,
    is_definitively_blocked: false,
  };

  // Paso 2 (OTP validado): devuelve el token.
  const otpResponse = {
    is_successful: true,
    message: 'ok',
    token: VALID_STUDENT_TOKEN,
    expiration_time: 1700000000,
    refresh_token: 'refresh-token-456',
    user_id: 'user-abc-123',
  };

  /** Autentica completo (login + OTP) para tests que necesitan sesión iniciada. */
  async function authenticate(): Promise<void> {
    const loginPromise = service.login(validCredentials);
    httpMock.expectOne(sessionUrl).flush(mockResponse);
    await loginPromise;
    const otpPromise = service.validateOtp('user-abc-123', '123456');
    httpMock.expectOne(otpUrl).flush(otpResponse);
    await otpPromise;
  }

  const validCredentials = {
    email: 'test@example.com',
    password: 'password123',
  };

  beforeEach(() => {
    sessionStorage.clear();
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        AuthService,
        JwtService,
        {
          provide: Router,
          useValue: { navigate: vi.fn() },
        },
      ],
    });
    service = TestBed.inject(AuthService);
    httpMock = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('login() sends POST to /users/sessions with correct payload', async () => {
    const loginPromise = service.login(validCredentials);

    const req = httpMock.expectOne(sessionUrl);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(validCredentials);
    req.flush(mockResponse);

    await loginPromise;
    // Paso 1: no hay token todavía; queda el user_id pendiente de OTP.
    expect(service.token()).toBeNull();
    expect(service.pendingOtpUserId()).toBe('user-abc-123');
  });

  it('login() does NOT authenticate on its own (needs OTP)', async () => {
    expect(service.isAuthenticated()).toBe(false);

    const loginPromise = service.login(validCredentials);
    httpMock.expectOne(sessionUrl).flush(mockResponse);

    await loginPromise;
    expect(service.isAuthenticated()).toBe(false);
  });

  it('validateOtp() stores the token and authenticates', async () => {
    await authenticate();
    expect(service.isAuthenticated()).toBe(true);
    expect(service.token()).toBe(VALID_STUDENT_TOKEN);
    expect(sessionStorage.getItem('auth_token')).toBe(VALID_STUDENT_TOKEN);
    expect(service.pendingOtpUserId()).toBeNull();
  });

  it('validateOtp() exposes decoded user and role from the JWT', async () => {
    await authenticate();
    expect(service.role()).toBe('student');
    expect(service.user()).toEqual({ userName: 'eider_test', role: 'student' });
  });

  it('validateOtp() sends POST to /users/otp/validate with user_id and otp', async () => {
    const otpPromise = service.validateOtp('user-abc-123', '123456');
    const req = httpMock.expectOne(otpUrl);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ user_id: 'user-abc-123', otp: '123456' });
    req.flush(otpResponse);
    await otpPromise;
  });

  it('login() throws error with mapped message on 401', async () => {
    const loginPromise = service.login(validCredentials);

    const req = httpMock.expectOne(sessionUrl);
    req.flush({ error: 'Invalid credentials' }, { status: 401, statusText: 'Unauthorized' });

    await expect(loginPromise).rejects.toThrow('Credenciales inválidas');
    expect(service.isAuthenticated()).toBe(false);
  });

  it('login() surfaces the backend validation message on 422', async () => {
    const loginPromise = service.login(validCredentials);

    const req = httpMock.expectOne(sessionUrl);
    req.flush(
      {
        detail: [
          {
            type: 'value_error',
            loc: ['body', 'password'],
            msg: 'Value error, La contraseña debe incluir al menos una letra',
          },
        ],
      },
      { status: 422, statusText: 'Unprocessable Entity' },
    );

    await expect(loginPromise).rejects.toThrow('La contraseña debe incluir al menos una letra');
  });

  it('login() throws connection error message on network error', async () => {
    const loginPromise = service.login(validCredentials);

    const req = httpMock.expectOne(sessionUrl);
    req.error(new ProgressEvent('Network error'));

    await expect(loginPromise).rejects.toThrow('Sin conexión al servidor');
  });

  it('logout() clears sessionStorage and resets signals', async () => {
    await authenticate();

    expect(service.isAuthenticated()).toBe(true);
    expect(sessionStorage.getItem('auth_token')).toBe(VALID_STUDENT_TOKEN);

    service.logout();

    expect(service.isAuthenticated()).toBe(false);
    expect(sessionStorage.getItem('auth_token')).toBeNull();
    expect(service.role()).toBeNull();
    expect(router.navigate).toHaveBeenCalledWith(['/login']);
  });

  describe('register', () => {
    const validRegisterCredentials = {
      email: 'nuevo@example.com',
      username: 'nuevo_user',
      password: 'Password123!',
    };
    const registerUrl = `${apiUrl}/users/`;

    it('sends POST to /users/ with correct payload and returns success response', async () => {
      const mockRegisterResponse = {
        is_success: true,
        message: 'User created successfully',
        user_id: 'abc123',
      };

      const registerPromise = service.register(validRegisterCredentials);

      const req = httpMock.expectOne(registerUrl);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(validRegisterCredentials);
      req.flush(mockRegisterResponse, { status: 201, statusText: 'Created' });

      const result = await registerPromise;
      expect(result).toEqual(mockRegisterResponse);
    });

    it('throws business error message on 400 duplicate email', async () => {
      const registerPromise = service.register(validRegisterCredentials);

      const req = httpMock.expectOne(registerUrl);
      req.flush(
        { detail: { message: { is_success: false, message: 'Este correo ya está registrado', user_id: null } } },
        { status: 400, statusText: 'Bad Request' },
      );

      await expect(registerPromise).rejects.toThrow('Este correo ya está registrado');
    });

    it('throws validation error message on 422 invalid password', async () => {
      const registerPromise = service.register(validRegisterCredentials);

      const req = httpMock.expectOne(registerUrl);
      req.flush(
        {
          detail: [
            { type: 'value_error', loc: ['body', 'password'], msg: 'Value error, La contraseña debe tener al menos 6 caracteres' },
          ],
        },
        { status: 422, statusText: 'Unprocessable Entity' },
      );

      await expect(registerPromise).rejects.toThrow('La contraseña debe tener al menos 6 caracteres');
    });

    it('throws connection error message on network error', async () => {
      const registerPromise = service.register(validRegisterCredentials);

      const req = httpMock.expectOne(registerUrl);
      req.error(new ProgressEvent('Network error'));

      await expect(registerPromise).rejects.toThrow('Sin conexión al servidor');
    });
  });

  describe('recoverPassword', () => {
    const validRecoverCredentials = { email: 'eider@itmentorsoft.local' };
    const recoverUrl = `${apiUrl}/users/recovery-password`;

    it('sends POST to /users/recovery-password with correct payload', async () => {
      const recoverPromise = service.recoverPassword(validRecoverCredentials);

      const req = httpMock.expectOne(recoverUrl);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(validRecoverCredentials);
      req.flush({
        message: 'If the email exists in our system, you will receive a password recovery email shortly.',
      });

      const result = await recoverPromise;
      expect(result.message).toContain('password recovery email');
    });

    it('always returns the same generic message regardless of whether the email exists', async () => {
      const recoverPromise = service.recoverPassword({ email: 'noexiste@itmentorsoft.local' });

      const req = httpMock.expectOne(recoverUrl);
      req.flush({
        message: 'If the email exists in our system, you will receive a password recovery email shortly.',
      });

      const result = await recoverPromise;
      expect(result.message).toBe(
        'If the email exists in our system, you will receive a password recovery email shortly.',
      );
    });

    it('throws validation error message on 422 invalid email format', async () => {
      const recoverPromise = service.recoverPassword({ email: 'not-an-email' });

      const req = httpMock.expectOne(recoverUrl);
      req.flush(
        {
          detail: [
            { type: 'value_error', loc: ['body', 'email'], msg: 'Value error, El formato del correo no es válido' },
          ],
        },
        { status: 422, statusText: 'Unprocessable Entity' },
      );

      await expect(recoverPromise).rejects.toThrow('El formato del correo no es válido');
    });

    it('throws connection error message on network error', async () => {
      const recoverPromise = service.recoverPassword(validRecoverCredentials);

      const req = httpMock.expectOne(recoverUrl);
      req.error(new ProgressEvent('Network error'));

      await expect(recoverPromise).rejects.toThrow('Sin conexión al servidor');
    });
  });

  describe('resendOtp', () => {
    const resendUrl = `${apiUrl}/users/resend-otp`;

    it('sends POST to /users/resend-otp with the user_id', async () => {
      const resendPromise = service.resendOtp('u1');

      const req = httpMock.expectOne(resendUrl);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({ user_id: 'u1' });
      req.flush({
        message: 'If your account exists, an OTP has been sent to your registered email.',
      });

      const result = await resendPromise;
      expect(result.message).toContain('OTP has been sent');
    });

    it('throws connection error message on network error', async () => {
      const resendPromise = service.resendOtp('u1');

      const req = httpMock.expectOne(resendUrl);
      req.error(new ProgressEvent('Network error'));

      await expect(resendPromise).rejects.toThrow('Sin conexión al servidor');
    });
  });

  describe('resetPassword', () => {
    const validResetCredentials = {
      token: 'plain-text-token-from-email',
      id_trx: 'trx-abc-123',
      new_password: 'NewPassword123!',
    };
    const resetUrl = `${apiUrl}/users/change-password`;

    it('sends PUT to /users/change-password with correct payload', async () => {
      const resetPromise = service.resetPassword(validResetCredentials);

      const req = httpMock.expectOne(
        (r) => r.url === resetUrl && r.method === 'PUT',
      );
      // token e id_trx van como query params; el body solo lleva new_password.
      expect(req.request.params.get('token')).toBe(validResetCredentials.token);
      expect(req.request.params.get('id_trx')).toBe(validResetCredentials.id_trx);
      expect(req.request.body).toEqual({ new_password: validResetCredentials.new_password });
      req.flush({ is_success: true, message: 'Password changed successfully' });

      const result = await resetPromise;
      expect(result).toEqual({ is_success: true, message: 'Password changed successfully' });
    });

    it('returns is_success false with message when token is invalid or expired (200 OK)', async () => {
      const resetPromise = service.resetPassword(validResetCredentials);

      const req = httpMock.expectOne((r) => r.url === resetUrl && r.method === 'PUT');
      req.flush({ is_success: false, message: 'Invalid or expired token' });

      const result = await resetPromise;
      expect(result.is_success).toBe(false);
      expect(result.message).toBe('Invalid or expired token');
    });

    it('throws validation error message on 422 invalid new_password', async () => {
      const resetPromise = service.resetPassword(validResetCredentials);

      const req = httpMock.expectOne((r) => r.url === resetUrl && r.method === 'PUT');
      req.flush(
        {
          detail: [
            { type: 'value_error', loc: ['body', 'new_password'], msg: 'Value error, La contraseña debe tener al menos 6 caracteres' },
          ],
        },
        { status: 422, statusText: 'Unprocessable Entity' },
      );

      await expect(resetPromise).rejects.toThrow('La contraseña debe tener al menos 6 caracteres');
    });

    it('throws connection error message on network error', async () => {
      const resetPromise = service.resetPassword(validResetCredentials);

      const req = httpMock.expectOne((r) => r.url === resetUrl && r.method === 'PUT');
      req.error(new ProgressEvent('Network error'));

      await expect(resetPromise).rejects.toThrow('Sin conexión al servidor');
    });
  });

  it('login() stores the pending user_id for the OTP step', async () => {
    const loginPromise = service.login(validCredentials);
    const req = httpMock.expectOne('/users/sessions');
    req.flush(mockResponse);
    await loginPromise;
    expect(service.pendingOtpUserId()).toBe('user-abc-123');
    // El userId "real" recién se fija al validar el OTP.
    expect(service.userId()).toBeNull();
  });

  it('logout() clears the stored user_id', async () => {
    const loginPromise = service.login(validCredentials);
    httpMock.expectOne('/users/sessions').flush(mockResponse);
    await loginPromise;
    service.logout();
    expect(service.userId()).toBeNull();
    expect(sessionStorage.getItem('auth_user_id')).toBeNull();
  });


  describe('refreshSession', () => {
    async function loginFirst() {
      const p = service.login({ email: 'a@b.co', password: 'x' } as never);
      httpMock.expectOne('/users/sessions').flush(mockResponse);
      await p;
      const otp = service.validateOtp('user-abc-123', '123456');
      httpMock.expectOne('/users/otp/validate').flush(otpResponse);
      await otp;
    }

    it('returns null when there is no current token', async () => {
      // sin login previo: no hay token actual
      const token = await service.refreshSession();
      expect(token).toBeNull();
    });

    it('refreshes the token with header + withCredentials and stores the new one', async () => {
      await loginFirst();
      const promise = service.refreshSession();
      const req = httpMock.expectOne('/users/sessions/refresh');
      expect(req.request.method).toBe('POST');
      // El refresh no manda el token en el body: va en la cookie (withCredentials) y el header.
      expect(req.request.withCredentials).toBe(true);
      expect(req.request.headers.get('Authorization')).toContain('Bearer ');
      req.flush({
        is_successful: true,
        access_token: 'NEW.jwt.token',
        refresh_token: 'new-refresh-789',
        expiration_time: 1700000000,
        user_id: 'user-abc-123',
      });
      const token = await promise;
      expect(token).toBe('NEW.jwt.token');
      expect(sessionStorage.getItem('auth_token')).toBe('NEW.jwt.token');
      expect(sessionStorage.getItem('auth_refresh_token')).toBe('new-refresh-789');
    });

    it('returns null when the refresh call fails', async () => {
      await loginFirst();
      const promise = service.refreshSession();
      httpMock
        .expectOne('/users/sessions/refresh')
        .flush({ detail: 'invalid' }, { status: 401, statusText: 'Unauthorized' });
      expect(await promise).toBeNull();
    });

    it('returns null when the backend answers without success', async () => {
      await loginFirst();
      const promise = service.refreshSession();
      httpMock.expectOne('/users/sessions/refresh').flush({ is_successful: false });
      expect(await promise).toBeNull();
    });

    it('returns null when the response has no token', async () => {
      await loginFirst();
      const promise = service.refreshSession();
      httpMock.expectOne('/users/sessions/refresh').flush({ is_successful: true });
      expect(await promise).toBeNull();
    });

    it('falls back to "token" when "access_token" is missing and refreshes the user name', async () => {
      await loginFirst();
      const renewed = fakeJwt({ user_name: 'nuevo_user', role: 'student', exp: 9999999999 });
      const promise = service.refreshSession();
      httpMock.expectOne('/users/sessions/refresh').flush({ is_successful: true, token: renewed });

      expect(await promise).toBe(renewed);
      expect(sessionStorage.getItem('auth_user_name')).toBe('nuevo_user');
    });

    it('keeps the previous user_id and refresh token when the response omits them', async () => {
      await loginFirst();
      const renewed = fakeJwt({ user_name: 'x', role: 'student', exp: 9999999999 });
      const promise = service.refreshSession();
      httpMock
        .expectOne('/users/sessions/refresh')
        .flush({ is_successful: true, access_token: renewed });
      await promise;

      expect(sessionStorage.getItem('auth_user_id')).toBe('user-abc-123');
      expect(sessionStorage.getItem('auth_refresh_token')).toBe('refresh-token-456');
    });
  });

  /** JWT sin firma válida: jwt-decode solo lee el payload. */
  function fakeJwt(payload: Record<string, unknown>): string {
    const b64 = (value: unknown) =>
      btoa(JSON.stringify(value)).replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_');
    return `${b64({ alg: 'HS256', typ: 'JWT' })}.${b64(payload)}.firma`;
  }

  async function signInWith(token: string, extra: Record<string, unknown> = {}): Promise<void> {
    const promise = service.validateOtp('user-abc-123', '123456');
    httpMock.expectOne(otpUrl).flush({ ...otpResponse, token, ...extra });
    await promise;
  }

  describe('homeRoute', () => {
    it('is "/" without a session', () => {
      expect(service.homeRoute()).toBe('/');
    });

    it.each([
      ['admin', '/admin'],
      ['teacher', '/teacher'],
      ['student', '/student'],
    ])('sends a %s to %s', async (role, route) => {
      await signInWith(fakeJwt({ user_name: 'u', role, exp: 9999999999 }));
      expect(service.homeRoute()).toBe(route);
    });

    it('is "/" for a role it does not know', async () => {
      await signInWith(fakeJwt({ user_name: 'u', role: 'auditor', exp: 9999999999 }));
      expect(service.homeRoute()).toBe('/');
    });
  });

  describe('validateOtp session handling', () => {
    it('clears the pending OTP user after a successful validation', async () => {
      const login = service.login(validCredentials);
      httpMock.expectOne(sessionUrl).flush(mockResponse);
      await login;
      expect(service.pendingOtpUserId()).toBe('user-abc-123');

      await signInWith(VALID_STUDENT_TOKEN);

      expect(service.pendingOtpUserId()).toBeNull();
      expect(sessionStorage.getItem('auth_pending_otp_user')).toBeNull();
    });

    it('does not start a session when the OTP is not successful', async () => {
      const promise = service.validateOtp('user-abc-123', '000000');
      httpMock.expectOne(otpUrl).flush({ is_successful: false, message: 'OTP inválido' });
      const response = await promise;

      expect(response.is_successful).toBe(false);
      expect(service.isAuthenticated()).toBe(false);
      expect(sessionStorage.getItem('auth_token')).toBeNull();
    });

    it('stores only the token when the response has no user_id or refresh token', async () => {
      await signInWith(VALID_STUDENT_TOKEN, { user_id: null, refresh_token: null });

      expect(sessionStorage.getItem('auth_token')).toBe(VALID_STUDENT_TOKEN);
      expect(sessionStorage.getItem('auth_user_id')).toBeNull();
      expect(sessionStorage.getItem('auth_refresh_token')).toBeNull();
    });

    it('does not store a user name when the token cannot be decoded', async () => {
      await signInWith('no-es-un-jwt');
      expect(sessionStorage.getItem('auth_user_name')).toBeNull();
    });

    it('throws the mapped error when the request fails', async () => {
      const promise = service.validateOtp('user-abc-123', '123456');
      httpMock.expectOne(otpUrl).flush({ detail: 'x' }, { status: 401, statusText: 'Unauthorized' });
      await expect(promise).rejects.toThrow('Credenciales inválidas');
    });
  });

  describe('expireSession', () => {
    it('logs out and redirects to the login with the expired flag', async () => {
      await authenticate();

      service.expireSession();

      expect(service.isAuthenticated()).toBe(false);
      expect(router.navigate).toHaveBeenCalledWith(['/login']);
      expect(router.navigate).toHaveBeenLastCalledWith(['/login'], { queryParams: { expired: '1' } });
    });
  });

  describe('logout cookies', () => {
    it('removes the cookies of the page', () => {
      document.cookie = 'sesion_prueba=abc; path=/';
      expect(document.cookie).toContain('sesion_prueba=abc');

      service.logout();

      expect(document.cookie).not.toContain('sesion_prueba');
    });
  });

  describe('session restore', () => {
    it('restores the session and the pending OTP user from sessionStorage', () => {
      sessionStorage.setItem('auth_token', VALID_STUDENT_TOKEN);
      sessionStorage.setItem('auth_user_id', 'user-abc-123');
      sessionStorage.setItem('auth_pending_otp_user', 'pending-1');
      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        imports: [HttpClientTestingModule],
        providers: [AuthService, JwtService, { provide: Router, useValue: { navigate: vi.fn() } }],
      });

      const restored = TestBed.inject(AuthService);

      expect(restored.isAuthenticated()).toBe(true);
      expect(restored.token()).toBe(VALID_STUDENT_TOKEN);
      expect(restored.userId()).toBe('user-abc-123');
      expect(restored.pendingOtpUserId()).toBe('pending-1');
      expect(restored.role()).toBe('student');
    });
  });

  describe('error mapping', () => {
    async function failLogin(status: number, body: unknown): Promise<Error> {
      const promise = service.login(validCredentials);
      httpMock.expectOne(sessionUrl).flush(body, { status, statusText: 'error' });
      return promise.then(
        () => new Error('no falló'),
        (error: Error) => error,
      );
    }

    it('maps 403 to "Acceso denegado"', async () => {
      expect((await failLogin(403, { detail: 'x' })).message).toBe('Acceso denegado');
    });

    it('maps other server errors to a generic message', async () => {
      expect((await failLogin(500, { detail: 'x' })).message).toBe(
        'Error en el servidor, intentá más tarde',
      );
    });

    it('maps a 400 without a business message to a generic one', async () => {
      expect((await failLogin(400, { detail: 'x' })).message).toBe('Solicitud inválida');
    });

    it('uses the business message of a 400 when there is one', async () => {
      const error = await failLogin(400, { detail: { message: { message: 'Correo duplicado' } } });
      expect(error.message).toBe('Correo duplicado');
    });

    it('maps a 422 without validation details to a generic message', async () => {
      expect((await failLogin(422, { detail: 'x' })).message).toBe('Datos inválidos');
    });

    it('maps a 422 whose first detail has no message to a generic message', async () => {
      expect((await failLogin(422, { detail: [{}] })).message).toBe('Datos inválidos');
    });

    it('keeps an Error that did not come from HTTP and names unknown failures', () => {
      const map = (service as unknown as { mapHttpError(e: unknown): Error }).mapHttpError.bind(service);
      const original = new Error('propio');
      expect(map(original)).toBe(original);
      expect(map('boom').message).toBe('Error desconocido');
    });
  });

});