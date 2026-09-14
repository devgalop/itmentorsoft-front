import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '@env/environment';
import { ENDPOINTS } from '@core/config/endpoints';
import {
  ContentItem,
  GetAllContentsResponse,
  GetContentByIdResponse,
  GetRecommendedLearningPathsResponse,
  PagedContents,
  RecommendedTopic,
  RegisterContentPayload,
  RegisterContentResponse,
  UpdateContentResponse,
} from './content.types';

@Injectable({ providedIn: 'root' })
export class ContentService {
  private readonly http = inject(HttpClient);

  /** Listado paginado de recursos (page arranca en 0; el backend exige ambos params). */
  /**
   * Ruta de aprendizaje recomendada para el estudiante: contenidos agrupados
   * por tema. Solo accesible por rol student.
   */
  async getRecommendedLearningPaths(userId: string): Promise<RecommendedTopic[]> {
    try {
      const response = await firstValueFrom(
        this.http.get<GetRecommendedLearningPathsResponse>(
          `${environment.apiUrl}${ENDPOINTS.content.recommendedLearningPaths}`,
          { params: { user_id: userId } },
        ),
      );
      return response.recommendation ?? [];
    } catch (error) {
      throw this.mapHttpError(error);
    }
  }

  async getAllContents(page = 0, pageSize = 50): Promise<ContentItem[]> {
    return (await this.getAllContentsPaged(page, pageSize)).items;
  }

  /** Igual que {@link getAllContents} pero conserva el `total` para paginar. */
  async getAllContentsPaged(page = 0, pageSize = 50): Promise<PagedContents> {
    try {
      const response = await firstValueFrom(
        this.http.get<GetAllContentsResponse>(`${environment.apiUrl}${ENDPOINTS.content.root}`, {
          params: { page, page_size: pageSize },
        }),
      );
      return { items: response.items ?? [], total: response.total ?? 0 };
    } catch (error) {
      throw this.mapHttpError(error);
    }
  }

  /** Detalle de un recurso por su ID. Devuelve null si no existe (404). */
  async getContentById(contentId: string): Promise<ContentItem | null> {
    try {
      const response = await firstValueFrom(
        this.http.get<GetContentByIdResponse>(
          `${environment.apiUrl}${ENDPOINTS.content.byId(contentId)}`,
        ),
      );
      return response.content ?? null;
    } catch (error) {
      if (error instanceof HttpErrorResponse && error.status === 404) {
        return null;
      }
      throw this.mapHttpError(error);
    }
  }

  /** Recursos filtrados por tema (page arranca en 0). */
  async getContentsByTopic(topic: string, page = 0, pageSize = 10): Promise<PagedContents> {
    return this.searchContents(ENDPOINTS.content.byTopic(topic), page, pageSize);
  }

  /** Recursos filtrados por categoría (page arranca en 0). */
  async getContentsByCategory(category: string, page = 0, pageSize = 10): Promise<PagedContents> {
    return this.searchContents(ENDPOINTS.content.byCategory(category), page, pageSize);
  }

  /** Recursos cuyo título contiene el criterio dado (page arranca en 0). */
  async getContentsByTitle(title: string, page = 0, pageSize = 10): Promise<PagedContents> {
    return this.searchContents(ENDPOINTS.content.byTitle(title), page, pageSize);
  }

  /** Recursos filtrados por categoría y tema a la vez (page arranca en 0). */
  async getContentsByCategoryTopic(
    category: string,
    topic: string,
    page = 0,
    pageSize = 10,
  ): Promise<PagedContents> {
    return this.searchContents(ENDPOINTS.content.byCategoryTopic(category, topic), page, pageSize);
  }

  /**
   * GET compartido por los 4 buscadores de arriba: misma forma de respuesta
   * (items/total) y el backend responde 404 cuando no hay coincidencias, lo
   * cual acá se trata como "sin resultados" y no como error.
   */
  private async searchContents(path: string, page: number, pageSize: number): Promise<PagedContents> {
    try {
      const response = await firstValueFrom(
        this.http.get<GetAllContentsResponse>(`${environment.apiUrl}${path}`, {
          params: { page, page_size: pageSize },
        }),
      );
      return { items: response.items ?? [], total: response.total ?? 0 };
    } catch (error) {
      if (error instanceof HttpErrorResponse && error.status === 404) {
        return { items: [], total: 0 };
      }
      throw this.mapHttpError(error);
    }
  }

  async registerContent(payload: RegisterContentPayload): Promise<RegisterContentResponse> {
    try {
      return await firstValueFrom(
        this.http.post<RegisterContentResponse>(`${environment.apiUrl}${ENDPOINTS.content.root}`, payload),
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
          `${environment.apiUrl}${ENDPOINTS.content.byId(contentId)}`,
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
