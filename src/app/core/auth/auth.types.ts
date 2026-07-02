export type UserRole = 'admin' | 'teacher' | 'student' | 'user';

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface LoginResponse {
  is_successful: boolean;
  token: string;
  expiration_time: number;
  refresh_token: string;
}

export interface RegisterCredentials {
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