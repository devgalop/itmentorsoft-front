import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '@env/environment';
import { ENDPOINTS } from '@core/config/endpoints';
import {
  AssignRoleResponse,
  CreateUserPayload,
  CreateUserResponse,
  GetAvailableRolesResponse,
  GetConnectedUsersResponse,
  GetUserResponse,
  UpdateProfilePayload,
  UpdateProfileResponse,
  UserInfo,
} from './users.types';

@Injectable({ providedIn: 'root' })
export class UsersService {
  private readonly http = inject(HttpClient);

  async getAvailableRoles(): Promise<string[]> {
    try {
      const response = await firstValueFrom(
        this.http.get<GetAvailableRolesResponse>(`${environment.apiUrl}${ENDPOINTS.users.availableRoles}`),
      );
      return response.roles ?? [];
    } catch (error) {
      throw this.mapHttpError(error);
    }
  }

  /**
   * Total de usuarios con sesión activa (refresh token vigente).
   * Accesible por admin.
   */
  async getConnectedTotal(): Promise<number> {
    try {
      const response = await firstValueFrom(
        this.http.get<GetConnectedUsersResponse>(
          `${environment.apiUrl}${ENDPOINTS.users.connectedTotal}`,
        ),
      );
      return response.total_users ?? 0;
    } catch (error) {
      throw this.mapHttpError(error);
    }
  }

  async getUser(userId: string): Promise<UserInfo | null> {
    try {
      const response = await firstValueFrom(
        this.http.get<GetUserResponse>(
          `${environment.apiUrl}${ENDPOINTS.users.byId(userId)}`,
        ),
      );
      return response.user ?? null;
    } catch (error) {
      throw this.mapHttpError(error);
    }
  }

  async assignRole(userId: string, role: string): Promise<AssignRoleResponse> {
    try {
      return await firstValueFrom(
        this.http.put<AssignRoleResponse>(`${environment.apiUrl}${ENDPOINTS.users.assignRole}`, {
          user_id: userId,
          role,
        }),
      );
    } catch (error) {
      throw this.mapHttpError(error);
    }
  }

  /** Actualiza el perfil (username + name) del usuario. */
  async updateProfile(payload: UpdateProfilePayload): Promise<UpdateProfileResponse> {
    try {
      return await firstValueFrom(
        this.http.put<UpdateProfileResponse>(
          `${environment.apiUrl}${ENDPOINTS.users.profile}`,
          payload,
        ),
      );
    } catch (error) {
      throw this.mapHttpError(error);
    }
  }

  async createUser(payload: CreateUserPayload): Promise<CreateUserResponse> {
    try {
      return await firstValueFrom(
        this.http.post<CreateUserResponse>(
          `${environment.apiUrl}${ENDPOINTS.users.createUserFromAdmin}`,
          payload,
        ),
      );
    } catch (error) {
      throw this.mapHttpError(error);
    }
  }

  private mapHttpError(error: unknown): Error {
    if (error instanceof HttpErrorResponse) {
      switch (error.status) {
        case 0:
          return new Error('Sin conexión al servidor');
        case 400:
          return new Error('Datos inválidos');
        case 401:
          return new Error('Sesión expirada, iniciá sesión de nuevo');
        case 403:
          return new Error('No tenés permisos para esta acción');
        case 404:
          return new Error('No se encontró el usuario');
        case 422:
          return new Error('Datos inválidos');
        default:
          return new Error('Error en el servidor, intentá más tarde');
      }
    }
    return error instanceof Error ? error : new Error('Error desconocido');
  }
}
