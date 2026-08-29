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

  const VALID_STUDENT_TOKEN =
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX25hbWUiOiJlaWRlcl90ZXN0Iiwicm9sZSI6InN0dWRlbnQiLCJleHAiOjE3ODIxMDY5OTV9.C29WG-n07km4acqGC5yyh_GOTLFM03cbdYeZ7Y-T5pM';

  const mockResponse: LoginResponse = {
    is_successful: true,
    token: VALID_STUDENT_TOKEN,
    expiration_time: 1700000000,
    refresh_token: 'refresh-token-456',
    user_id: 'user-abc-123',
  };

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
    expect(sessionStorage.getItem('auth_token')).toBe(VALID_STUDENT_TOKEN);
  });

  it('login() stores token in sessionStorage and updates isAuthenticated on success', async () => {
    expect(service.isAuthenticated()).toBe(false);

    const loginPromise = service.login(validCredentials);
    const req = httpMock.expectOne(sessionUrl);
    req.flush(mockResponse);

    await loginPromise;
    expect(service.isAuthenticated()).toBe(true);
    expect(service.token()).toBe(VALID_STUDENT_TOKEN);
  });

  it('login() exposes decoded user and role from the JWT', async () => {
    const loginPromise = service.login(validCredentials);
    const req = httpMock.expectOne(sessionUrl);
    req.flush(mockResponse);

    await loginPromise;
    expect(service.role()).toBe('student');
    expect(service.user()).toEqual({ userName: 'eider_test', role: 'student' });
  });

  it('login() throws error with mapped message on 401', async () => {
    const loginPromise = service.login(validCredentials);

    const req = httpMock.expectOne(sessionUrl);
    req.flush({ error: 'Invalid credentials' }, { status: 401, statusText: 'Unauthorized' });

    await expect(loginPromise).rejects.toThrow('Credenciales inválidas');
    expect(service.isAuthenticated()).toBe(false);
  });

  it('login() translates a 422 backend validation message to Spanish', async () => {
    const loginPromise = service.login(validCredentials);

    const req = httpMock.expectOne(sessionUrl);
    req.flush(
      {
        detail: [
          {
            type: 'value_error',
            loc: ['body', 'password'],
            msg: 'Value error, Password must contain at least one letter',
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
    const loginPromise = service.login(validCredentials);
    const req = httpMock.expectOne(sessionUrl);
    req.flush(mockResponse);
    await loginPromise;

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
        { detail: { message: { is_success: false, message: 'Email already in use', user_id: null } } },
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
            { type: 'value_error', loc: ['body', 'password'], msg: 'Value error, Password must be at least 6 characters long' },
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
            { type: 'value_error', loc: ['body', 'email'], msg: 'Value error, Invalid email format' },
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
            { type: 'value_error', loc: ['body', 'new_password'], msg: 'Value error, Password must be at least 6 characters long' },
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

  it('login() stores user_id from the response and exposes it via userId()', async () => {
    const loginPromise = service.login(validCredentials);
    const req = httpMock.expectOne('/users/sessions');
    req.flush(mockResponse);
    await loginPromise;
    expect(service.userId()).toBe('user-abc-123');
    expect(sessionStorage.getItem('auth_user_id')).toBe('user-abc-123');
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
  });

});