import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '@env/environment';
import { ENDPOINTS } from '@core/config/endpoints';
import {
  AssessmentSummary,
  GeneratedAssessment,
  GetAssessmentByTopicResponse,
  GetAssessmentResultResponse,
  GetAssessmentsSummaryResponse,
  GetTopicsResponse,
  QualificationStatusResponse,
  SaveAssessmentPayload,
  SaveAssessmentResponse,
  StudentAssessmentResult,
} from './student-assessment.types';

@Injectable({ providedIn: 'root' })
export class StudentAssessmentService {
  private readonly http = inject(HttpClient);

  /** Temas disponibles para evaluarse. */
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

  /** Genera una evaluación para un tema. Devuelve el assessment_id y las preguntas. */
  async generateByTopic(
    topic: string,
    userId: string,
    numberOfQuestions: number,
  ): Promise<GeneratedAssessment> {
    try {
      const response = await firstValueFrom(
        this.http.get<GetAssessmentByTopicResponse>(`${environment.apiUrl}${ENDPOINTS.assessments.topic}`, {
          params: { topic, user_id: userId, number_of_questions: numberOfQuestions },
        }),
      );
      if (!response.is_success || !response.assessment_id) {
        throw new Error(response.message || 'No se pudo generar la evaluación');
      }
      return {
        assessmentId: response.assessment_id,
        topicId: response.topic_id ?? null,
        questions: response.questions ?? [],
      };
    } catch (error) {
      throw this.mapHttpError(error);
    }
  }

  /** Guarda las respuestas de la evaluación. */
  async saveAnswers(payload: SaveAssessmentPayload): Promise<SaveAssessmentResponse> {
    try {
      return await firstValueFrom(
        this.http.post<SaveAssessmentResponse>(`${environment.apiUrl}${ENDPOINTS.assessments.root}`, payload),
      );
    } catch (error) {
      throw this.mapHttpError(error);
    }
  }

  /** Estado de la calificación (asíncrona). true = ya calificada. */
  async getQualificationStatus(userId: string, assessmentId: string): Promise<boolean> {
    try {
      const response = await firstValueFrom(
        this.http.get<QualificationStatusResponse>(
          `${environment.apiUrl}${ENDPOINTS.assessments.qualificationStatus}`,
          { params: { user_id: userId, assessment_id: assessmentId } },
        ),
      );
      return response.is_already_qualified === true;
    } catch (error) {
      throw this.mapHttpError(error);
    }
  }

  /** Resultado detallado de una evaluación ya calificada. */
  async getResult(userId: string, assessmentId: string): Promise<StudentAssessmentResult | null> {
    try {
      const response = await firstValueFrom(
        this.http.get<GetAssessmentResultResponse>(
          `${environment.apiUrl}${ENDPOINTS.assessments.assessmentResult}`,
          { params: { user_id: userId, assessment_id: assessmentId } },
        ),
      );
      return response.result ?? null;
    } catch (error) {
      throw this.mapHttpError(error);
    }
  }

  /** Historial de evaluaciones del estudiante (resumen paginado). */
  async getAssessmentsSummary(
    studentId: string,
    page = 0,
    pageSize = 20,
  ): Promise<AssessmentSummary[]> {
    try {
      const response = await firstValueFrom(
        this.http.get<GetAssessmentsSummaryResponse>(
          `${environment.apiUrl}${ENDPOINTS.assessments.summary}`,
          { params: { student_id: studentId, page, page_size: pageSize } },
        ),
      );
      return response.assessments ?? [];
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
        case 404:
          return new Error('No se encontró la evaluación');
        case 422:
          return new Error('Datos inválidos');
        default:
          return new Error('Error en el servidor, intentá más tarde');
      }
    }
    return error instanceof Error ? error : new Error('Error desconocido');
  }
}
