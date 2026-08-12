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
        students: [
          { student_id: 's1', student_name: 'Eider', knowledge_classification: 'novice' },
        ],
        total_students: 1,
        page: 0,
      },
    });
    const res = await promise;
    expect(res.total).toBe(1);
    expect(res.students).toHaveLength(1);
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
