import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '@env/environment';
import { ENDPOINTS } from '@core/config/endpoints';
import { errorDetailText } from '@core/http/error-detail';
import {
  ContentItem,
  ContentRating,
  GetAllContentsResponse,
  GetContentByIdResponse,
  GetRatingsByUserResponse,
  GetTopContentResponse,
  GenerateLearningPathResponse,
  GetCompleteLearningPathResponse,
  GenerateLearningPathResult,
  PagedContents,
  RateContentPayload,
  RateContentResponse,
  RecommendedTopic,
  TopicPathRef,
  UpdatePathContentStatusPayload,
  UpdatePathContentStatusResponse,
  RegisterContentPayload,
  RegisterContentResponse,
  TopContentItem,
  UpdateContentResponse,
  UpdateRatingPayload,
  UpdateRatingResponse,
  UpdateResourceStatusPayload,
  UpdateResourceStatusResponse,
} from './content.types';

@Injectable({ providedIn: 'root' })
export class ContentService {
  private readonly http = inject(HttpClient);

  /** Listado paginado de recursos (page arranca en 0; el backend exige ambos params). */
  /**
   * Todas las rutas del estudiante (un tema cada una) con sus recursos, el avance y qué recursos
   * ya se vieron. El backend las entrega de la más reciente a la más antigua e incluye las ya
   * completadas. Devuelve [] si no tiene ninguna.
   */
  async getCompleteLearningPaths(userId: string, pageSize = 100): Promise<RecommendedTopic[]> {
    try {
      const response = await firstValueFrom(
        this.http.get<GetCompleteLearningPathResponse>(
          `${environment.apiUrl}${ENDPOINTS.content.completeLearningPath}`,
          { params: { user_id: userId, page: 0, page_size: pageSize } },
        ),
      );
      return response.learning_path ?? [];
    } catch (error) {
      // Sin rutas el backend responde "404: La ruta de aprendizaje no fue encontrada" (a veces envuelto en un 500).
      if (error instanceof HttpErrorResponse) {
        const detail = errorDetailText(error);
        if (error.status === 404 || /no fue encontrada|not found/i.test(detail)) return [];
      }
      throw this.mapHttpError(error);
    }
  }

  /**
   * Marca (o desmarca) un recurso de la ruta como visto. Devuelve el avance del tema (0–100)
   * ya recalculado por el backend. Solo rol student.
   */
  async setLearningPathContentStatus(pathId: string, contentId: string, status: boolean): Promise<number> {
    try {
      const payload: UpdatePathContentStatusPayload = { path_id: pathId, content_id: contentId, status };
      const response = await firstValueFrom(
        this.http.put<UpdatePathContentStatusResponse>(
          `${environment.apiUrl}${ENDPOINTS.content.updateLearningPathStatus}`,
          payload,
        ),
      );
      if (!response.is_success) {
        throw new Error(response.message || 'No se pudo actualizar el recurso.');
      }
      return response.path_progress ?? 0;
    } catch (error) {
      throw this.mapHttpError(error);
    }
  }

  /**
   * Genera la ruta del estudiante a partir de su perfil. El backend devuelve los ids de los
   * temas solo cuando la crea; si ya tenía una ruta sin completar responde un error sin ids.
   */
  async generateLearningPath(studentId: string): Promise<GenerateLearningPathResult> {
    try {
      const response = await firstValueFrom(
        this.http.post<GenerateLearningPathResponse>(
          `${environment.apiUrl}${ENDPOINTS.content.generateLearningPath}`,
          null,
          { params: { student_id: studentId } },
        ),
      );
      const paths: TopicPathRef[] = response.learning_path ?? [];
      return response.is_success && paths.length > 0
        ? { created: true, paths }
        : { created: false, reason: 'failed', message: response.message };
    } catch (error) {
      if (error instanceof HttpErrorResponse && error.status !== 0 && error.status !== 401 && error.status !== 403) {
        // El backend envuelve el mensaje en el detalle ("400: La ruta … ya existe …").
        const detail = errorDetailText(error);
        if (/ya existe|already exists/i.test(detail)) return { created: false, reason: 'exists', message: detail };
        if (/no se encontraron resultados|no results/i.test(detail)) {
          return { created: false, reason: 'no-evaluation', message: detail };
        }
        if (error.status !== 422) return { created: false, reason: 'failed', message: detail };
      }
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

  /** Califica un recurso (1-5 estrellas). Solo rol student, sobre su propio user_id. */
  async rateContent(payload: RateContentPayload): Promise<RateContentResponse> {
    try {
      return await firstValueFrom(
        this.http.post<RateContentResponse>(`${environment.apiUrl}${ENDPOINTS.content.rate}`, payload),
      );
    } catch (error) {
      throw this.mapHttpError(error);
    }
  }

  /**
   * Calificaciones que el estudiante ya hizo. Solo rol student, sobre su propio user_id.
   * Si no tiene ninguna el backend responde con error (404, o 500 por cómo lo envuelve),
   * así que un 404 se interpreta como lista vacía.
   */
  async getRatingsByUser(userId: string): Promise<ContentRating[]> {
    try {
      const response = await firstValueFrom(
        this.http.get<GetRatingsByUserResponse>(`${environment.apiUrl}${ENDPOINTS.content.ratingsAll}`, {
          params: { user_id: userId },
        }),
      );
      return response.rating_details ?? [];
    } catch (error) {
      // Sin calificaciones el backend responde un 404, o un 500 que lo trae envuelto en el mensaje.
      if (
        error instanceof HttpErrorResponse &&
        (error.status === 404 || /no (fue )?encontrad|not found|no se encontr/i.test(errorDetailText(error)))
      ) {
        return [];
      }
      throw this.mapHttpError(error);
    }
  }

  /** Contenidos mejor calificados de un tema (admin, teacher y student). */
  getTopBestContent(topic: string, limit = 5): Promise<TopContentItem[]> {
    return this.getTopContent(ENDPOINTS.content.topBest(limit), topic);
  }

  /** Contenidos peor calificados de un tema (admin, teacher y student). */
  getTopWorseContent(topic: string, limit = 5): Promise<TopContentItem[]> {
    return this.getTopContent(ENDPOINTS.content.topWorse(limit), topic);
  }

  /**
   * Si el tema no tiene contenidos calificados el backend responde con error (404, o 500
   * por cómo lo envuelve), así que un 404 se interpreta como lista vacía.
   */
  private async getTopContent(path: string, topic: string): Promise<TopContentItem[]> {
    try {
      const response = await firstValueFrom(
        this.http.get<GetTopContentResponse>(`${environment.apiUrl}${path}`, {
          params: { topic },
        }),
      );
      return response.items ?? [];
    } catch (error) {
      if (error instanceof HttpErrorResponse && error.status === 404) return [];
      throw this.mapHttpError(error);
    }
  }

  /**
   * Activa o desactiva un recurso (solo admin). Un recurso desactivado deja de aparecer en
   * todos los listados y búsquedas.
   */
  async updateResourceStatus(
    contentId: string,
    status: boolean,
  ): Promise<UpdateResourceStatusResponse> {
    try {
      const payload: UpdateResourceStatusPayload = { content_id: contentId, status };
      return await firstValueFrom(
        this.http.put<UpdateResourceStatusResponse>(
          `${environment.apiUrl}${ENDPOINTS.content.updateStatus}`,
          payload,
        ),
      );
    } catch (error) {
      throw this.mapHttpError(error);
    }
  }

  /** Modifica una calificación ya existente (0-5). Solo rol student. */
  async updateRating(payload: UpdateRatingPayload): Promise<UpdateRatingResponse> {
    try {
      return await firstValueFrom(
        this.http.put<UpdateRatingResponse>(`${environment.apiUrl}${ENDPOINTS.content.modifyRating}`, payload),
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
          return new Error('Sesión expirada, inicia sesión de nuevo');
        case 403:
          return new Error('No tienes permisos para esta acción');
        case 422:
          return new Error('Datos inválidos');
        default:
          return new Error('Error en el servidor, intenta más tarde');
      }
    }
    return error instanceof Error ? error : new Error('Error desconocido');
  }
}
