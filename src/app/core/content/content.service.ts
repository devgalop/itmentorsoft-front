import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '@env/environment';
import {
  ContentItem,
  GetAllContentsResponse,
  RegisterContentPayload,
  RegisterContentResponse,
  UpdateContentResponse,
} from './content.types';

@Injectable({ providedIn: 'root' })
export class ContentService {
  private readonly http = inject(HttpClient);

  /** Listado paginado de recursos (page arranca en 0; el backend exige ambos params). */
  async getAllContents(page = 0, pageSize = 50): Promise<ContentItem[]> {
    try {
      const response = await firstValueFrom(
        this.http.get<GetAllContentsResponse>(`${environment.apiUrl}/content/`, {
          params: { page, page_size: pageSize },
        }),
      );
      return response.items ?? [];
    } catch (error) {
      throw this.mapHttpError(error);
    }
  }

  async registerContent(payload: RegisterContentPayload): Promise<RegisterContentResponse> {
    try {
      return await firstValueFrom(
        this.http.post<RegisterContentResponse>(`${environment.apiUrl}/content/`, payload),
      );
    } catch (error) {
      throw this.mapHttpError(error);
    }
  }

  async updateContent(
    contentId: string,
    payload: RegisterContentPayload,
  ): Promise<UpdateContentResponse> {
    try {
      return await firstValueFrom(
        this.http.put<UpdateContentResponse>(
          `${environment.apiUrl}/content/${encodeURIComponent(contentId)}`,
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
        case 401:
          return new Error('Sesión expirada, iniciá sesión de nuevo');
        case 403:
          return new Error('No tenés permisos para esta acción');
        case 422:
          return new Error('Datos inválidos');
        default:
          return new Error('Error en el servidor, intentá más tarde');
      }
    }
    return error instanceof Error ? error : new Error('Error desconocido');
  }
}
