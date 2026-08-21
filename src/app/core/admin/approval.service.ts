import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '@env/environment';
import {
  GetPendingApprovalResponse,
  PagedPending,
  ReviewQuestionPayload,
  ReviewQuestionResponse,
} from './approval.types';

@Injectable({ providedIn: 'root' })
export class ApprovalService {
  private readonly http = inject(HttpClient);

  /** Preguntas pendientes de aprobación (admin). page arranca en 0. */
  async getPending(page = 0, pageSize = 10): Promise<PagedPending> {
    try {
      const response = await firstValueFrom(
        this.http.get<GetPendingApprovalResponse>(
          `${environment.apiUrl}/assessments/pending-approval-questions`,
          { params: { page, page_size: pageSize } },
        ),
      );
      return { questions: response.questions ?? [], total: response.total ?? 0 };
    } catch (error) {
      throw this.mapHttpError(error);
    }
  }

  /** Aprueba (published) o rechaza (archived) una pregunta. */
  async reviewQuestion(payload: ReviewQuestionPayload): Promise<ReviewQuestionResponse> {
    try {
      return await firstValueFrom(
        this.http.post<ReviewQuestionResponse>(
          `${environment.apiUrl}/assessments/review`,
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
          return new Error(this.extractDetail(error) ?? 'Datos inválidos');
        case 401:
          return new Error('Sesión expirada, iniciá sesión de nuevo');
        case 403:
          return new Error('No tenés permisos para esta acción');
        case 422:
          return new Error(this.extractDetail(error) ?? 'Datos inválidos');
        default:
          return new Error('Error en el servidor, intentá más tarde');
      }
    }
    return error instanceof Error ? error : new Error('Error desconocido');
  }

  private extractDetail(error: HttpErrorResponse): string | null {
    const detail = error.error?.detail;
    if (typeof detail === 'string') return detail;
    if (Array.isArray(detail) && detail.length > 0) {
      return detail[0]?.msg?.replace('Value error, ', '') ?? null;
    }
    return null;
  }
}
