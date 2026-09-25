export type UserRole = 'admin' | 'teacher' | 'student' | 'user';

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface LoginResponse {
  is_successful: boolean;
  user_id: string | null;
  is_temporarily_blocked: boolean;
  blocked_until: number;
  is_definitively_blocked: boolean;
}

export interface ConfirmOtpCredentials {
  user_id: string;
  otp: string;
}

export interface ConfirmOtpResponse {
  is_successful: boolean;
  message: string;
  token: string | null;
  expiration_time: number;
  refresh_token: string | null;
  user_id: string | null;
}

/** Respuesta del refresh de sesión (POST /users/sessions/refresh). */
export interface RefreshResponse {
  is_successful: boolean;
  token?: string | null;
  access_token?: string | null;
  refresh_token?: string | null;
  expiration_time?: number;
  user_id?: string | null;
}

export interface RegisterCredentials {
  name: string;
  email: string;
  username: string;
  password: string;
}

export interface RegisterResponse {
  is_success: boolean;
  message: string;
  user_id: string | null;
}

export interface RecoverPasswordCredentials {
  email: string;
}

export interface RecoverPasswordResponse {
  message: string;
}

/** Respuesta del reenvío de OTP (POST /users/resend-otp). Siempre 200 con un mensaje genérico. */
export interface ResendOtpResponse {
  message: string;
}

export interface ResetPasswordCredentials {
  token: string;
  id_trx: string;
  new_password: string;
}

export interface ResetPasswordResponse {
  is_success: boolean;
  message: string;
}

export interface JwtPayload {
  user_name: string;
  role: UserRole;
  exp: number;
}

export interface AuthUser {
  userName: string;
  role: UserRole;
}