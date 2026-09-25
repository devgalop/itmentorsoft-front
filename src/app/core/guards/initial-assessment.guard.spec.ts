import { TestBed } from '@angular/core/testing';
import { Router, UrlTree } from '@angular/router';
import { vi } from 'vitest';
import { initialAssessmentGuard } from './initial-assessment.guard';
import { InitialAssessmentService } from '../student/initial-assessment.service';

describe('initialAssessmentGuard', () => {
  let serviceMock: { hasCompleted: ReturnType<typeof vi.fn> };
  let routerMock: { createUrlTree: ReturnType<typeof vi.fn> };

  function run() {
    return TestBed.runInInjectionContext(() =>
      initialAssessmentGuard({} as never, {} as never),
    );
  }

  beforeEach(() => {
    serviceMock = { hasCompleted: vi.fn() };
    routerMock = { createUrlTree: vi.fn().mockReturnValue({ __url: true } as unknown as UrlTree) };
    TestBed.configureTestingModule({
      providers: [
        { provide: InitialAssessmentService, useValue: serviceMock },
        { provide: Router, useValue: routerMock },
      ],
    });
  });

  it('allows activation when the student completed the initial assessment', async () => {
    serviceMock.hasCompleted.mockResolvedValue(true);
    expect(await run()).toBe(true);
    expect(routerMock.createUrlTree).not.toHaveBeenCalled();
  });

  it('redirects to the dashboard when not completed', async () => {
    serviceMock.hasCompleted.mockResolvedValue(false);
    const result = await run();
    expect(routerMock.createUrlTree).toHaveBeenCalledWith(['/student/dashboard']);
    expect(result).toEqual({ __url: true });
  });
});
