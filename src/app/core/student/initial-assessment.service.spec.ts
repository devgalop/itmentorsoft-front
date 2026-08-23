import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { InitialAssessmentService } from './initial-assessment.service';
import { AuthService } from '../auth/auth.service';
import { ReportsService } from '../reports/reports.service';

describe('InitialAssessmentService', () => {
  let reportsMock: { getStudentSummary: ReturnType<typeof vi.fn> };
  let authMock: { userId: ReturnType<typeof vi.fn> };

  function make(): InitialAssessmentService {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        InitialAssessmentService,
        { provide: ReportsService, useValue: reportsMock },
        { provide: AuthService, useValue: authMock },
      ],
    });
    return TestBed.inject(InitialAssessmentService);
  }

  beforeEach(() => {
    reportsMock = { getStudentSummary: vi.fn() };
    authMock = { userId: vi.fn().mockReturnValue('u1') };
  });

  it('returns false when there is no userId', async () => {
    authMock.userId.mockReturnValue(null);
    const s = make();
    expect(await s.hasCompleted()).toBe(false);
  });

  it('returns false when summary is null', async () => {
    reportsMock.getStudentSummary.mockResolvedValue(null);
    const s = make();
    expect(await s.hasCompleted()).toBe(false);
  });

  it('returns false when classification is a placeholder and profile is empty', async () => {
    reportsMock.getStudentSummary.mockResolvedValue({
      knowledge_classification: 'This classification will be determined based on the student',
      profile: [],
      feedback: '',
    });
    const s = make();
    expect(await s.hasCompleted()).toBe(false);
  });

  it('returns true when there is a real classification', async () => {
    reportsMock.getStudentSummary.mockResolvedValue({
      knowledge_classification: 'básico',
      profile: [],
      feedback: 'ok',
    });
    const s = make();
    expect(await s.hasCompleted()).toBe(true);
  });

  it('returns true when the profile has data even if classification is placeholder', async () => {
    reportsMock.getStudentSummary.mockResolvedValue({
      knowledge_classification: 'This classification will be determined based on the student',
      profile: [{ topic: 'POO', score: 0.5 }],
      feedback: '',
    });
    const s = make();
    expect(await s.hasCompleted()).toBe(true);
  });

  it('caches the result and does not call the API twice', async () => {
    reportsMock.getStudentSummary.mockResolvedValue({
      knowledge_classification: 'básico',
      profile: [],
      feedback: '',
    });
    const s = make();
    await s.hasCompleted();
    await s.hasCompleted();
    expect(reportsMock.getStudentSummary).toHaveBeenCalledTimes(1);
  });

  it('assumes completed (true) on API error to avoid over-hiding', async () => {
    reportsMock.getStudentSummary.mockRejectedValue(new Error('boom'));
    const s = make();
    expect(await s.hasCompleted()).toBe(true);
  });
});
