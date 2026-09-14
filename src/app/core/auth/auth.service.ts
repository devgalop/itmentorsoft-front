import { Injectable, computed, signal } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { JwtService } from './jwt.service';
import {
  AuthUser,
  ConfirmOtpResponse,
  RefreshResponse,
  LoginCredentials,
  LoginResponse,
  RecoverPasswordCredentials,
  RecoverPasswordResponse,
  RegisterCredentials,
  RegisterResponse,
  ResendOtpResponse,
  ResetPasswordCredentials,
  ResetPasswordResponse,
} from './auth.types';
import { environment } from '@env/environment';
import { ENDPOINTS } from '@core/config/endpoints';

const TOKEN_KEY = 'auth_token';
const USER_ID_KEY = 'auth_user_id';
const REFRESH_KEY = 'auth_refresh_token';
const USERNAME_KEY = 'auth_user_name';
const PENDING_OTP_KEY = 'auth_pending_otp_user';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly _token = signal<string | null>(sessionStorage.getItem(TOKEN_KEY));
  private readonly _userId = signal<string | null>(sessionStorage.getItem(USER_ID_KEY));
  private readonly _refreshToken = signal<string | null>(sessionStorage.getItem(REFRESH_KEY));
  private readonly _userName = signal<string | null>(sessionStorage.getItem(USERNAME_KEY));
  /** user_id que quedó pendiente de validar OTP tras el login (paso 1). */
  private readonly _pendingOtpUserId = signal<string | null>(
    sessionStorage.getItem(PENDING_OTP_KEY),
  );
  private readonly _isAuthenticated = computed(() => this._token() !== null);

  private readonly _user = computed<AuthUser | null>(() => {
    const token = this._token();
    return token ? this.jwtService.decode(token) : null;
  });

  readonly token = this._token.asReadonly();
  readonly userId = this._userId.asReadonly();
  readonly isAuthenticated = this._isAuthenticated;
  readonly user = this._user;
  readonly role = computed<AuthUser['role'] | null>(() => this._user()?.role ?? null);
  readonly pendingOtpUserId = this._pendingOtpUserId.asReadonly();

  constructor(
    private readonly http: HttpClient,
    private readonly router: Router,
    private readonly jwtService: JwtService,
  ) {}

  /**
   * Paso 1 del login: valida email/password. NO devuelve token todavía —
   * el backend envía un OTP por correo. Guarda el user_id pendiente para el
   * paso 2 (validar OTP). Devuelve la respuesta (incluye estados de bloqueo).
   */
  async login(credentials: LoginCredentials): Promise<LoginResponse> {
    try {
      const response = await firstValueFrom(
        this.http.post<LoginResponse>(`${environment.apiUrl}${ENDPOINTS.users.sessions}`, credentials, {
          withCredentials: true,
        }),
      );
      if (response.is_successful && response.user_id) {
        this._pendingOtpUserId.set(response.user_id);
        sessionStorage.setItem(PENDING_OTP_KEY, response.user_id);
      }
      return response;
    } catch (error) {
      throw this.mapHttpError(error);
    }
  }

  /**
   * Paso 2 del login: valida el OTP. Si es correcto, el backend devuelve el
   * token y la sesión queda iniciada.
   */
  async validateOtp(userId: string, otp: string): Promise<ConfirmOtpResponse> {
    try {
      const response = await firstValueFrom(
        this.http.post<ConfirmOtpResponse>(
          `${environment.apiUrl}${ENDPOINTS.users.otpValidate}`,
          { user_id: userId, otp },
          { withCredentials: true },
        ),
      );
      if (response.is_successful && response.token) {
        this.persistSession(response.token, response.refresh_token, response.user_id);
        this._pendingOtpUserId.set(null);
        sessionStorage.removeItem(PENDING_OTP_KEY);
      }
      return response;
    } catch (error) {
      throw this.mapHttpError(error);
    }
  }

  /**
   * Reenvía el OTP al correo del usuario pendiente de validar. El backend
   * siempre responde 200 con un mensaje genérico (no revela si el user_id
   * existe), y cada reenvío cuenta como un intento para el bloqueo por
   * demasiados intentos fallidos — por eso el componente lo limita con un cooldown.
   */
  async resendOtp(userId: string): Promise<ResendOtpResponse> {
    try {
      return await firstValueFrom(
        this.http.post<ResendOtpResponse>(`${environment.apiUrl}${ENDPOINTS.users.resendOtp}`, {
          user_id: userId,
        }),
      );
    } catch (error) {
      throw this.mapHttpError(error);
    }
  }

  /** Guarda token, refresh, user_id y user_name (del JWT) en memoria y sessionStorage. */
  private persistSession(token: string, refreshToken: string | null, userId: string | null): void {
    this._token.set(token);
    sessionStorage.setItem(TOKEN_KEY, token);
    if (userId) {
      this._userId.set(userId);
      sessionStorage.setItem(USER_ID_KEY, userId);
    }
    if (refreshToken) {
      this._refreshToken.set(refreshToken);
      sessionStorage.setItem(REFRESH_KEY, refreshToken);
    }
    const decoded = this.jwtService.decode(token);
    if (decoded?.userName) {
      this._userName.set(decoded.userName);
      sessionStorage.setItem(USERNAME_KEY, decoded.userName);
    }
  }

  /** Ruta de inicio según el rol (para redirigir tras autenticarse). */
  homeRoute(): string {
    switch (this.role()) {
      case 'admin':
        return '/admin';
      case 'teacher':
        return '/teacher';
      case 'student':
        return '/student';
      default:
        return '/';
    }
  }

  async register(credentials: RegisterCredentials): Promise<RegisterResponse> {
    try {
      return await firstValueFrom(
        this.http.post<RegisterResponse>(`${environment.apiUrl}${ENDPOINTS.users.root}`, credentials),
      );
    } catch (error) {
      throw this.mapHttpError(error);
    }
  }

  async recoverPassword(
    credentials: RecoverPasswordCredentials,
  ): Promise<RecoverPasswordResponse> {
    try {
      return await firstValueFrom(
        this.http.post<RecoverPasswordResponse>(
          `${environment.apiUrl}${ENDPOINTS.users.recoveryPassword}`,
          credentials,
        ),
      );
    } catch (error) {
      throw this.mapHttpError(error);
    }
  }

  async resetPassword(credentials: ResetPasswordCredentials): Promise<ResetPasswordResponse> {
    try {
      // El backend (PUT /users/change-password) espera `token` e `id_trx` como
      // query params; el body solo lleva `new_password`. Mandarlos en el body
      // provoca un 422 "field required".
      const params = new HttpParams()
        .set('token', credentials.token)
        .set('id_trx', credentials.id_trx);

      return await firstValueFrom(
        this.http.put<ResetPasswordResponse>(
          `${environment.apiUrl}${ENDPOINTS.users.changePassword}`,
          { new_password: credentials.new_password },
          { params },
        ),
      );
    } catch (error) {
      throw this.mapHttpError(error);
    }
  }

  logout(): void {
    this._token.set(null);
    this._userId.set(null);
    this._refreshToken.set(null);
    this._userName.set(null);
    this._pendingOtpUserId.set(null);
    sessionStorage.removeItem(TOKEN_KEY);
    sessionStorage.removeItem(USER_ID_KEY);
    sessionStorage.removeItem(REFRESH_KEY);
    sessionStorage.removeItem(USERNAME_KEY);
    sessionStorage.removeItem(PENDING_OTP_KEY);
    this.clearAllCookies();
    this.router.navigate(['/login']);
  }

  /**
   * Intenta renovar el token con el refresh token guardado.
   * Devuelve el nuevo access token si tuvo éxito, o null si falló (sesión no recuperable).
   */
  async refreshSession(): Promise<string | null> {
    // El backend lee el refresh_token de una cookie httpOnly (seteada en el login)
    // y el token actual del header Authorization (lo agrega el interceptor).
    // El body va vacío y hay que enviar las cookies con withCredentials.
    const currentToken = this._token();
    if (!currentToken) {
      return null;
    }
    try {
      const response = await firstValueFrom(
        this.http.post<RefreshResponse>(
          `${environment.apiUrl}${ENDPOINTS.users.refreshSession}`,
          {},
          {
            withCredentials: true,
            headers: { Authorization: `Bearer ${currentToken}` },
          },
        ),
      );
      const newToken = response.access_token ?? response.token;
      if (!response.is_successful || !newToken) {
        return null;
      }
      this._token.set(newToken);
      sessionStorage.setItem(TOKEN_KEY, newToken);
      const decoded = this.jwtService.decode(newToken);
      if (decoded?.userName) {
        this._userName.set(decoded.userName);
        sessionStorage.setItem(USERNAME_KEY, decoded.userName);
      }
      if (response.user_id) {
        this._userId.set(response.user_id);
        sessionStorage.setItem(USER_ID_KEY, response.user_id);
      }
      if (response.refresh_token) {
        this._refreshToken.set(response.refresh_token);
        sessionStorage.setItem(REFRESH_KEY, response.refresh_token);
      }
      return newToken;
    } catch {
      return null;
    }
  }

  /** Cierra la sesión por expiración y redirige al login con un aviso. */
  expireSession(): void {
    this.logout();
    this.router.navigate(['/login'], { queryParams: { expired: '1' } });
  }

  private clearAllCookies(): void {
    const cookies = document.cookie.split(';');
    const paths = ['/', '/users', '/api'];
    const domains = ['', `.${location.hostname}`, location.hostname];

    for (const cookie of cookies) {
      const name = cookie.split('=')[0]?.trim();
      if (!name) continue;

      for (const path of paths) {
        for (const domain of domains) {
          document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=${path}${domain ? `; domain=${domain}` : ''}`;
        }
      }
    }
  }

  private mapHttpError(error: unknown): Error {
    if (error instanceof HttpErrorResponse) {
      switch (error.status) {
        case 0:
          return new Error('Sin conexión al servidor');
        case 400:
          return new Error(this.extractBusinessErrorMessage(error) ?? 'Solicitud inválida');
        case 401:
          return new Error('Credenciales inválidas');
        case 403:
          return new Error('Acceso denegado');
        case 422:
          return new Error(this.extractValidationMessage(error) ?? 'Datos inválidos');
        default:
          return new Error('Error en el servidor, intentá más tarde');
      }
    }
    return error instanceof Error ? error : new Error('Error desconocido');
  }

  private extractValidationMessage(error: HttpErrorResponse): string | null {
    const detail = error.error?.detail;
    if (Array.isArray(detail) && detail.length > 0) {
      const rawMsg: string | undefined = detail[0]?.msg;
      return rawMsg?.replace('Value error, ', '') ?? null;
    }
    return null;
  }

  private extractBusinessErrorMessage(error: HttpErrorResponse): string | null {
    const message = error.error?.detail?.message?.message;
    return typeof message === 'string' ? message : null;
  }
}
