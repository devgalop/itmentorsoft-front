import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '@env/environment';
import { ENDPOINTS } from '@core/config/endpoints';
import {
  EvaluativeQuestion,
  GetAllQuestionsResponse,
  GetCategoriesResponse,
  GetTopicsResponse,
  GetQuestionByIdResponse,
  GetQuestionsResponse,
  PagedQuestions,
  QuestionDetail,
  RegisterQuestionPayload,
  RegisterQuestionResponse,
  UpdateQuestionResponse,
} from './assessments.types';

@Injectable({ providedIn: 'root' })
export class AssessmentsService {
  private readonly http = inject(HttpClient);

  async getQuestionsByLevel(difficulty: string): Promise<EvaluativeQuestion[]> {
    try {
      const response = await firstValueFrom(
        this.http.get<GetQuestionsResponse>(
          `${environment.apiUrl}${ENDPOINTS.assessments.questionsByLevel(difficulty)}`,
        ),
      );
      return response.questions ?? [];
    } catch (error) {
      throw this.mapHttpError(error);
    }
  }

  async getQuestionsByCategory(category: string): Promise<EvaluativeQuestion[]> {
    try {
      const response = await firstValueFrom(
        this.http.get<GetQuestionsResponse>(
          `${environment.apiUrl}${ENDPOINTS.assessments.questionsByCategory(category)}`,
        ),
      );
      return response.questions ?? [];
    } catch (error) {
      throw this.mapHttpError(error);
    }
  }

  async getQuestionById(questionId: string): Promise<QuestionDetail | null> {
    try {
      const response = await firstValueFrom(
        this.http.get<GetQuestionByIdResponse>(
          `${environment.apiUrl}${ENDPOINTS.assessments.questionById(questionId)}`,
        ),
      );
      return response.question ?? null;
    } catch (error) {
      throw this.mapHttpError(error);
    }
  }

  /** Listado paginado de todas las preguntas (page arranca en 0). */
  async getAllQuestions(page = 0, pageSize = 10): Promise<PagedQuestions> {
    try {
      const response = await firstValueFrom(
        this.http.get<GetAllQuestionsResponse>(`${environment.apiUrl}${ENDPOINTS.assessments.questions}`, {
          params: { page, page_size: pageSize },
        }),
      );
      return { questions: response.questions ?? [], total: response.total ?? 0 };
    } catch (error) {
      throw this.mapHttpError(error);
    }
  }

  async getCategories(version = 1): Promise<string[]> {
    try {
      const response = await firstValueFrom(
        this.http.get<GetCategoriesResponse>(`${environment.apiUrl}${ENDPOINTS.assessments.categories}`, {
          params: { version },
        }),
      );
      return response.categories ?? [];
    } catch (error) {
      throw this.mapHttpError(error);
    }
  }

  /** Temas disponibles (GET /assessments/topics). */
  async getTopics(): Promise<string[]> {
    try {
      const response = await firstValueFrom(
        this.http.get<GetTopicsResponse>(`${environment.apiUrl}${ENDPOINTS.assessments.topics}`),
      );
      return response.topics ?? [];
    } catch (error) {
      throw this.mapHttpError(error);
    }
  }

  async registerQuestion(payload: RegisterQuestionPayload): Promise<RegisterQuestionResponse> {
    try {
      return await firstValueFrom(
        this.http.post<RegisterQuestionResponse>(
          `${environment.apiUrl}${ENDPOINTS.assessments.registerQuestion}`,
          payload,
        ),
      );
    } catch (error) {
      throw this.mapHttpError(error);
    }
  }

  async updateQuestion(
    questionId: string,
    payload: RegisterQuestionPayload,
  ): Promise<UpdateQuestionResponse> {
    try {
      return await firstValueFrom(
        this.http.put<UpdateQuestionResponse>(
          `${environment.apiUrl}${ENDPOINTS.assessments.questionById(questionId)}`,
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
          return new Error('No tenés permisos para ver este contenido');
        case 404:
          return new Error('No se encontraron resultados');
        default:
          return new Error('Error en el servidor, intentá más tarde');
      }
    }
    return error instanceof Error ? error : new Error('Error desconocido');
  }
}
