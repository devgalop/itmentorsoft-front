import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '@env/environment';
import { ENDPOINTS } from '@core/config/endpoints';
import {
  GetAllStudentsResponse,
  GetStudentsByCategoryResponse,
  GetStudentProgressResponse,
  GetStudentSummaryResponse,
  PagedStudents,
  StudentProgress,
  StudentSummary,
} from './reports.types';

@Injectable({ providedIn: 'root' })
export class ReportsService {
  private readonly http = inject(HttpClient);

  /** Lista paginada de estudiantes con su clasificación (page arranca en 0). */
  async getStudents(page = 0, pageSize = 10): Promise<PagedStudents> {
    try {
      const response = await firstValueFrom(
        this.http.get<GetAllStudentsResponse>(`${environment.apiUrl}${ENDPOINTS.reports.students}`, {
          params: { page, page_size: pageSize },
        }),
      );
      const result = response.result;
      return {
        students: result?.students ?? [],
        total: result?.total_students ?? 0,
      };
    } catch (error) {
      throw this.mapHttpError(error);
    }
  }

  /** Estudiantes filtrados por categoría/clasificación (page arranca en 0). */
  async getStudentsByCategory(category: string, page = 0, pageSize = 10): Promise<PagedStudents> {
    try {
      const response = await firstValueFrom(
        this.http.get<GetStudentsByCategoryResponse>(
          `${environment.apiUrl}${ENDPOINTS.reports.studentsByCategory}`,
          { params: { category, page, page_size: pageSize } },
        ),
      );
      const result = response.result;
      return {
        students: result?.students ?? [],
        total: result?.total_students ?? 0,
      };
    } catch (error) {
      throw this.mapHttpError(error);
    }
  }

  async getStudentProgress(id: string): Promise<StudentProgress | null> {
    try {
      const response = await firstValueFrom(
        this.http.get<GetStudentProgressResponse>(`${environment.apiUrl}${ENDPOINTS.reports.studentProgress}`, {
          params: { id },
        }),
      );
      return response.progress ?? null;
    } catch (error) {
      throw this.mapHttpError(error);
    }
  }

  async getStudentSummary(id: string): Promise<StudentSummary | null> {
    try {
      const response = await firstValueFrom(
        this.http.get<GetStudentSummaryResponse>(`${environment.apiUrl}${ENDPOINTS.reports.studentSummary}`, {
          params: { id },
        }),
      );
      return response.summary ?? null;
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
          return new Error('No se encontró el estudiante');
        case 422:
          return new Error('Parámetros inválidos');
        default:
          return new Error('Error en el servidor, intentá más tarde');
      }
    }
    return error instanceof Error ? error : new Error('Error desconocido');
  }
}
