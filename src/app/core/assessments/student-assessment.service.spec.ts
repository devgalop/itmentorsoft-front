import { TestBed } from '@angular/core/testing';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { StudentAssessmentService } from './student-assessment.service';

describe('StudentAssessmentService', () => {
  let service: StudentAssessmentService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        StudentAssessmentService,
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    });
    service = TestBed.inject(StudentAssessmentService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  describe('getQuantity', () => {
    it('GETs /assessments/quantity with student_id and returns the total', async () => {
      const promise = service.getQuantity('s1');

      const req = httpMock.expectOne(
        (r) => r.url === '/assessments/quantity' && r.params.get('student_id') === 's1',
      );
      expect(req.request.method).toBe('GET');
      req.flush({
        is_success: true,
        message: 'Quantity of assessments retrieved successfully.',
        total_assessments: 5,
      });

      expect(await promise).toBe(5);
    });

    it('returns 0 when the backend omits total_assessments', async () => {
      const promise = service.getQuantity('s1');
      httpMock
        .expectOne((r) => r.url === '/assessments/quantity')
        .flush({ is_success: true, message: 'ok' });
      expect(await promise).toBe(0);
    });

    it('maps a 404 into a not-found error', async () => {
      const promise = service.getQuantity('missing');
      httpMock
        .expectOne((r) => r.url === '/assessments/quantity')
        .flush({ detail: 'Student not found' }, { status: 404, statusText: 'Not Found' });
      await expect(promise).rejects.toThrow('No se encontró la evaluación');
    });
  });

  describe('getTopics', () => {
    it('GETs /assessments/topics and returns the list', async () => {
      const promise = service.getTopics();
      const req = httpMock.expectOne('/assessments/topics');
      expect(req.request.method).toBe('GET');
      req.flush({ is_success: true, message: 'ok', topics: ['POO', 'SOLID'] });
      expect(await promise).toEqual(['POO', 'SOLID']);
    });

    it('returns an empty list when the backend omits topics', async () => {
      const promise = service.getTopics();
      httpMock.expectOne('/assessments/topics').flush({ is_success: true, message: 'ok' });
      expect(await promise).toEqual([]);
    });
  });

  describe('generateByTopic', () => {
    it('GETs /assessments/topic with topic and user_id and maps the response', async () => {
      const promise = service.generateByTopic('POO', 'u1');
      const req = httpMock.expectOne(
        (r) =>
          r.url === '/assessments/topic' &&
          r.params.get('topic') === 'POO' &&
          r.params.get('user_id') === 'u1',
      );
      expect(req.request.method).toBe('GET');
      const questions = [{ question_id: 'q1', text_to_evaluate: 'Pregunta' }];
      req.flush({
        is_success: true,
        message: 'ok',
        assessment_id: 'a1',
        topic_id: 't1',
        questions,
      });
      expect(await promise).toEqual({ assessmentId: 'a1', topicId: 't1', questions });
    });

    it('defaults topicId to null and questions to [] when they are missing', async () => {
      const promise = service.generateByTopic('POO', 'u1');
      httpMock
        .expectOne((r) => r.url === '/assessments/topic')
        .flush({ is_success: true, message: 'ok', assessment_id: 'a1' });
      expect(await promise).toEqual({ assessmentId: 'a1', topicId: null, questions: [] });
    });

    it('throws the backend message when is_success is false', async () => {
      const promise = service.generateByTopic('POO', 'u1');
      httpMock
        .expectOne((r) => r.url === '/assessments/topic')
        .flush({ is_success: false, message: 'Tema sin preguntas', assessment_id: null });
      await expect(promise).rejects.toThrow('Tema sin preguntas');
    });

    it('throws a default message when there is no assessment_id and no message', async () => {
      const promise = service.generateByTopic('POO', 'u1');
      httpMock
        .expectOne((r) => r.url === '/assessments/topic')
        .flush({ is_success: true, message: '', assessment_id: null });
      await expect(promise).rejects.toThrow('No se pudo generar la evaluación');
    });
  });

  describe('saveAnswers', () => {
    it('POSTs the payload to /assessments/', async () => {
      const payload = {
        assessment_id: 'a1',
        user_id: 'u1',
        answers: [{ question_id: 'q1', answer: 'mi respuesta' }],
      } as never;
      const promise = service.saveAnswers(payload);
      const req = httpMock.expectOne('/assessments/');
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(payload);
      req.flush({ is_success: true, message: 'saved' });
      expect(await promise).toEqual({ is_success: true, message: 'saved' });
    });

    it('maps a 422 into an invalid-data error', async () => {
      const promise = service.saveAnswers({} as never);
      httpMock
        .expectOne('/assessments/')
        .flush({ detail: 'x' }, { status: 422, statusText: 'Unprocessable Entity' });
      await expect(promise).rejects.toThrow('Datos inválidos');
    });
  });

  describe('getQualificationStatus', () => {
    it('GETs /assessments/qualification-status and returns true when qualified', async () => {
      const promise = service.getQualificationStatus('u1', 'a1');
      const req = httpMock.expectOne(
        (r) =>
          r.url === '/assessments/qualification-status' &&
          r.params.get('user_id') === 'u1' &&
          r.params.get('assessment_id') === 'a1',
      );
      expect(req.request.method).toBe('GET');
      req.flush({ is_already_qualified: true });
      expect(await promise).toBe(true);
    });

    it('returns false when it is not qualified yet', async () => {
      const promise = service.getQualificationStatus('u1', 'a1');
      httpMock
        .expectOne((r) => r.url === '/assessments/qualification-status')
        .flush({ is_already_qualified: false });
      expect(await promise).toBe(false);
    });
  });

  describe('getResult', () => {
    it('GETs /assessments/assessment_result and returns the result', async () => {
      const result = {
        assessment_id: 'a1',
        user_id: 'u1',
        avg_score: 2.5,
        classification: 'Intermedio',
        feedback: 'Bien',
        answer_scores: [],
      };
      const promise = service.getResult('u1', 'a1');
      const req = httpMock.expectOne(
        (r) =>
          r.url === '/assessments/assessment_result' &&
          r.params.get('user_id') === 'u1' &&
          r.params.get('assessment_id') === 'a1',
      );
      expect(req.request.method).toBe('GET');
      req.flush({ is_success: true, message: 'ok', result });
      expect(await promise).toEqual(result);
    });

    it('returns null when the backend sends no result', async () => {
      const promise = service.getResult('u1', 'a1');
      httpMock
        .expectOne((r) => r.url === '/assessments/assessment_result')
        .flush({ is_success: true, message: 'ok', result: null });
      expect(await promise).toBeNull();
    });
  });

  describe('getAssessmentsSummary', () => {
    it('GETs /assessments/summary with the default pagination', async () => {
      const assessments = [
        {
          assessment_id: 'a1',
          score: 3,
          date_taken: '2026-09-20',
          classification: 'Avanzado',
          feedback: null,
        },
      ];
      const promise = service.getAssessmentsSummary('s1');
      const req = httpMock.expectOne(
        (r) =>
          r.url === '/assessments/summary' &&
          r.params.get('student_id') === 's1' &&
          r.params.get('page') === '0' &&
          r.params.get('page_size') === '20',
      );
      expect(req.request.method).toBe('GET');
      req.flush({ is_success: true, message: 'ok', assessments });
      expect(await promise).toEqual(assessments);
    });

    it('sends a custom page and page size', async () => {
      const promise = service.getAssessmentsSummary('s1', 2, 5);
      httpMock
        .expectOne(
          (r) =>
            r.url === '/assessments/summary' &&
            r.params.get('page') === '2' &&
            r.params.get('page_size') === '5',
        )
        .flush({ is_success: true, message: 'ok', assessments: [] });
      expect(await promise).toEqual([]);
    });

    it('returns an empty list when the backend omits assessments', async () => {
      const promise = service.getAssessmentsSummary('s1');
      httpMock
        .expectOne((r) => r.url === '/assessments/summary')
        .flush({ is_success: true, message: 'ok' });
      expect(await promise).toEqual([]);
    });
  });

  describe('error mapping', () => {
    const cases: [number, string][] = [
      [0, 'Sin conexión al servidor'],
      [401, 'Sesión expirada, iniciá sesión de nuevo'],
      [403, 'No tenés permisos para esta acción'],
      [404, 'No se encontró la evaluación'],
      [422, 'Datos inválidos'],
      [500, 'Error en el servidor, intentá más tarde'],
    ];

    it.each(cases)('maps HTTP %i to "%s"', async (status, message) => {
      const promise = service.getTopics();
      httpMock
        .expectOne('/assessments/topics')
        .flush({ detail: 'x' }, { status, statusText: 'error' });
      await expect(promise).rejects.toThrow(message);
    });

    it('lets a network failure (status 0) surface as no connection', async () => {
      const promise = service.getTopics();
      httpMock.expectOne('/assessments/topics').error(new ProgressEvent('error'));
      await expect(promise).rejects.toThrow('Sin conexión al servidor');
    });
  });
});
