import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '@env/environment';
import { GetAllStudentsResponse, PagedStudents } from './reports.types';

@Injectable({ providedIn: 'root' })
export class ReportsService {
  private readonly http = inject(HttpClient);

  /** Lista paginada de estudiantes con su clasificación (page arranca en 0). */
  async getStudents(page = 0, pageSize = 10): Promise<PagedStudents> {
    try {
      const response = await firstValueFrom(
        this.http.get<GetAllStudentsResponse>(`${environment.apiUrl}/reports/students`, {
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
          return new Error('Parámetros inválidos');
        default:
          return new Error('Error en el servidor, intentá más tarde');
      }
    }
    return error instanceof Error ? error : new Error('Error desconocido');
  }
}
