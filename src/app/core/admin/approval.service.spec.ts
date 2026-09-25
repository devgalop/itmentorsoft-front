import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { ApprovalService } from './approval.service';

describe('ApprovalService', () => {
  let service: ApprovalService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [ApprovalService, provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(ApprovalService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  describe('getPending', () => {
    it('GETs pending-approval-questions with pagination', async () => {
      const promise = service.getPending(0, 5);
      const req = httpMock.expectOne(
        (r) =>
          r.url === '/assessments/pending-approval-questions' &&
          r.params.get('page') === '0' &&
          r.params.get('page_size') === '5',
      );
      expect(req.request.method).toBe('GET');
      req.flush({ is_success: true, message: 'ok', questions: [], total: 7 });
      const res = await promise;
      expect(res.total).toBe(7);
    });

    it('returns empty results when questions is missing', async () => {
      const promise = service.getPending();
      httpMock
        .expectOne((r) => r.url === '/assessments/pending-approval-questions')
        .flush({ is_success: true, message: 'ok' });
      const res = await promise;
      expect(res.questions).toEqual([]);
      expect(res.total).toBe(0);
    });
  });

  describe('reviewQuestion', () => {
    const payload = {
      question_id: 'q-123',
      reviewer_id: 'admin-1',
      review_comments: 'Se ve correcta y bien formulada.',
      status: 'published' as const,
    };

    it('POSTs the review payload', async () => {
      const promise = service.reviewQuestion(payload);
      const req = httpMock.expectOne('/assessments/review');
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(payload);
      req.flush({ is_success: true, message: 'Aprobada' });
      const res = await promise;
      expect(res.is_success).toBe(true);
    });

    it('maps a 400 with detail into that message', async () => {
      const promise = service.reviewQuestion(payload);
      httpMock
        .expectOne('/assessments/review')
        .flush({ detail: 'Invalid status' }, { status: 400, statusText: 'Bad Request' });
      await expect(promise).rejects.toThrow('Invalid status');
    });

    it('maps a 403 into a permissions error', async () => {
      const promise = service.reviewQuestion(payload);
      httpMock
        .expectOne('/assessments/review')
        .flush({ detail: 'x' }, { status: 403, statusText: 'Forbidden' });
      await expect(promise).rejects.toThrow('No tenés permisos para esta acción');
    });
  });

  describe('error mapping', () => {
    const payload = {
      question_id: 'q-1',
      reviewer_id: 'admin-1',
      review_comments: 'Comentario de revisión.',
      status: 'archived' as const,
    };

    it.each([
      [0, 'Sin conexión al servidor'],
      [401, 'Sesión expirada, iniciá sesión de nuevo'],
      [403, 'No tenés permisos para esta acción'],
      [500, 'Error en el servidor, intentá más tarde'],
    ])('maps HTTP %i to "%s"', async (status, message) => {
      const promise = service.getPending();
      httpMock
        .expectOne((r) => r.url === '/assessments/pending-approval-questions')
        .flush({ detail: 'x' }, { status, statusText: 'error' });
      await expect(promise).rejects.toThrow(message);
    });

    it('uses the string detail of a 422', async () => {
      const promise = service.reviewQuestion(payload);
      httpMock
        .expectOne('/assessments/review')
        .flush({ detail: 'Pregunta no encontrada' }, { status: 422, statusText: 'Unprocessable' });
      await expect(promise).rejects.toThrow('Pregunta no encontrada');
    });

    it('uses the first validation message of a 422 and strips "Value error, "', async () => {
      const promise = service.reviewQuestion(payload);
      httpMock
        .expectOne('/assessments/review')
        .flush(
          { detail: [{ msg: 'Value error, El comentario es muy corto' }] },
          { status: 422, statusText: 'Unprocessable' },
        );
      await expect(promise).rejects.toThrow('El comentario es muy corto');
    });

    it('falls back to a generic message when a 422 has no usable detail', async () => {
      const promise = service.reviewQuestion(payload);
      httpMock
        .expectOne('/assessments/review')
        .flush({ detail: [{}] }, { status: 422, statusText: 'Unprocessable' });
      await expect(promise).rejects.toThrow('Datos inválidos');
    });

    it('falls back to a generic message when a 400 has no detail', async () => {
      const promise = service.reviewQuestion(payload);
      httpMock
        .expectOne('/assessments/review')
        .flush({}, { status: 400, statusText: 'Bad Request' });
      await expect(promise).rejects.toThrow('Datos inválidos');
    });

    it('lets a network failure surface as no connection', async () => {
      const promise = service.getPending();
      httpMock
        .expectOne((r) => r.url === '/assessments/pending-approval-questions')
        .error(new ProgressEvent('error'));
      await expect(promise).rejects.toThrow('Sin conexión al servidor');
    });
  });
});
