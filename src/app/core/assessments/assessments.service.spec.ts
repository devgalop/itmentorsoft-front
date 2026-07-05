import { TestBed } from '@angular/core/testing';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { AssessmentsService } from './assessments.service';

describe('AssessmentsService', () => {
  let service: AssessmentsService;
  let httpMock: HttpTestingController;

  const base = '/assessments/questions';

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        AssessmentsService,
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    });
    service = TestBed.inject(AssessmentsService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  describe('getQuestionsByLevel', () => {
    it('GETs the encoded difficulty and returns the questions array', async () => {
      const promise = service.getQuestionsByLevel('básico');

      const req = httpMock.expectOne(`${base}/level/${encodeURIComponent('básico')}`);
      expect(req.request.method).toBe('GET');
      req.flush({
        is_success: true,
        message: 'ok',
        questions: [{ question_id: 'q1', text_to_evaluate: '¿Qué es SOLID?' }],
      });

      const result = await promise;
      expect(result).toEqual([{ question_id: 'q1', text_to_evaluate: '¿Qué es SOLID?' }]);
    });

    it('returns an empty array when the backend omits questions', async () => {
      const promise = service.getQuestionsByLevel('avanzado');
      const req = httpMock.expectOne(`${base}/level/avanzado`);
      req.flush({ is_success: true, message: 'ok', questions: [] });
      expect(await promise).toEqual([]);
    });

    it('maps a 403 into a permissions error', async () => {
      const promise = service.getQuestionsByLevel('intermedio');
      const req = httpMock.expectOne(`${base}/level/intermedio`);
      req.flush({ detail: 'Not enough permissions' }, { status: 403, statusText: 'Forbidden' });
      await expect(promise).rejects.toThrow('No tenés permisos para ver este contenido');
    });
  });

  describe('getQuestionsByCategory', () => {
    it('GETs the encoded category (accents/spaces) and returns questions', async () => {
      const category = 'Diseño orientado a objetos';
      const promise = service.getQuestionsByCategory(category);

      const req = httpMock.expectOne(`${base}/category/${encodeURIComponent(category)}`);
      expect(req.request.method).toBe('GET');
      req.flush({ is_success: true, message: 'ok', questions: [] });

      expect(await promise).toEqual([]);
    });
  });

  describe('getQuestionById', () => {
    it('GETs the id and returns the question detail', async () => {
      const promise = service.getQuestionById('q1');

      const req = httpMock.expectOne(`${base}/q1`);
      expect(req.request.method).toBe('GET');
      const detail = {
        question_id: 'q1',
        text: 'Explica el principio de responsabilidad única',
        concept: 'SRP',
        definition: 'Una clase debe tener una sola razón para cambiar',
        simple_explanation: 'Cada clase, una responsabilidad',
        correct_sample: 'Separar persistencia de la lógica de negocio',
        wrong_sample: 'Una clase que valida, persiste y notifica',
        common_misconception: ['Confundir SRP con métodos cortos', 'Creer que es una sola función'],
        rubric: [{ score: 3, explanation: 'Explica y ejemplifica correctamente' }],
        semantic_keywords: ['cohesión', 'responsabilidad'],
        status: 'published',
      };
      req.flush({ is_success: true, message: 'ok', question: detail });

      expect(await promise).toEqual(detail);
    });

    it('returns null when the question is not present', async () => {
      const promise = service.getQuestionById('missing');
      const req = httpMock.expectOne(`${base}/missing`);
      req.flush({ is_success: false, message: 'not found', question: null });
      expect(await promise).toBeNull();
    });

    it('maps a 404 into a not-found error', async () => {
      const promise = service.getQuestionById('x');
      const req = httpMock.expectOne(`${base}/x`);
      req.flush({ detail: 'not found' }, { status: 404, statusText: 'Not Found' });
      await expect(promise).rejects.toThrow('No se encontraron resultados');
    });
  });
});
