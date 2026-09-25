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
});
