import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { ReportsService } from './reports.service';

describe('ReportsService', () => {
  let service: ReportsService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [ReportsService, provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(ReportsService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  describe('getStudents', () => {
    it('GETs /reports/students with page and page_size', async () => {
      const promise = service.getStudents(0, 10);
      const req = httpMock.expectOne(
        (r) =>
          r.url === '/reports/students' &&
          r.params.get('page') === '0' &&
          r.params.get('page_size') === '10',
      );
      expect(req.request.method).toBe('GET');
      req.flush({
        is_success: true,
        message: 'ok',
        result: {
          students: [{ student_id: 's1', student_name: 'Eider', knowledge_classification: 'novice' }],
          total_students: 1,
          page: 0,
        },
      });
      const res = await promise;
      expect(res.total).toBe(1);
      expect(res.students[0].student_name).toBe('Eider');
    });

    it('returns empty results when result is null', async () => {
      const promise = service.getStudents(1, 5);
      httpMock
        .expectOne((r) => r.params.get('page') === '1')
        .flush({ is_success: true, message: 'sin datos', result: null });
      const res = await promise;
      expect(res.students).toEqual([]);
      expect(res.total).toBe(0);
    });

    it('maps a 403 into a permissions error', async () => {
      const promise = service.getStudents();
      httpMock
        .expectOne((r) => r.url === '/reports/students')
        .flush({ detail: 'x' }, { status: 403, statusText: 'Forbidden' });
      await expect(promise).rejects.toThrow('No tenés permisos para esta acción');
    });
  });

  describe('getStudentProgress', () => {
    it('GETs student_progress with the id', async () => {
      const promise = service.getStudentProgress('s1');
      const req = httpMock.expectOne(
        (r) => r.url === '/reports/student_progress' && r.params.get('id') === 's1',
      );
      expect(req.request.method).toBe('GET');
      req.flush({
        is_success: true,
        message: 'ok',
        progress: {
          student_id: 's1',
          classification: 'average',
          knowledge_profile: [{ topic: 'POO', score: 0.8, index: 0 }],
        },
      });
      const res = await promise;
      expect(res?.classification).toBe('average');
      expect(res?.knowledge_profile).toHaveLength(1);
    });

    it('returns null when progress is missing', async () => {
      const promise = service.getStudentProgress('x');
      httpMock
        .expectOne((r) => r.url === '/reports/student_progress')
        .flush({ is_success: false, message: 'no data', progress: null });
      expect(await promise).toBeNull();
    });
  });

  describe('getStudentSummary', () => {
    it('GETs student_summary with the id', async () => {
      const promise = service.getStudentSummary('s1');
      const req = httpMock.expectOne(
        (r) => r.url === '/reports/student_summary' && r.params.get('id') === 's1',
      );
      req.flush({
        is_success: true,
        message: 'ok',
        summary: {
          student_id: 's1',
          name: 'Eider',
          knowledge_classification: 'average',
          profile: [{ topic: 'POO', score: 0.8 }],
          feedback: 'Buen avance',
        },
      });
      const res = await promise;
      expect(res?.name).toBe('Eider');
      expect(res?.feedback).toBe('Buen avance');
    });

    it('maps a 404 into a not-found error', async () => {
      const promise = service.getStudentSummary('missing');
      httpMock
        .expectOne((r) => r.url === '/reports/student_summary')
        .flush({ detail: 'nf' }, { status: 404, statusText: 'Not Found' });
      await expect(promise).rejects.toThrow('No se encontró el estudiante');
    });
  });

  describe('getStudentsByCategory', () => {
    it('GETs students-by-category with category and pagination', async () => {
      const promise = service.getStudentsByCategory('básico', 0, 10);
      const req = httpMock.expectOne(
        (r) =>
          r.url === '/reports/students-by-category' &&
          r.params.get('category') === 'básico' &&
          r.params.get('page') === '0' &&
          r.params.get('page_size') === '10',
      );
      expect(req.request.method).toBe('GET');
      req.flush({
        is_success: true,
        message: 'ok',
        result: {
          students: [{ student_id: 's1', student_name: 'Ana', knowledge_classification: 'básico' }],
          total_students: 1,
          page: 0,
        },
      });
      const res = await promise;
      expect(res.students).toHaveLength(1);
      expect(res.total).toBe(1);
    });

    it('returns empty when result is null', async () => {
      const promise = service.getStudentsByCategory('avanzado');
      httpMock
        .expectOne((r) => r.url === '/reports/students-by-category')
        .flush({ is_success: true, message: 'ok', result: null });
      const res = await promise;
      expect(res.students).toEqual([]);
      expect(res.total).toBe(0);
    });
  });

});
