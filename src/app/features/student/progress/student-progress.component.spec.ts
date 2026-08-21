import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { StudentProgressComponent } from './student-progress.component';
import { ReportsService } from '../../../core/reports/reports.service';
import { AuthService } from '../../../core/auth/auth.service';

describe('StudentProgressComponent', () => {
  let reportsMock: { getStudentSummary: ReturnType<typeof vi.fn> };
  let authMock: { userId: ReturnType<typeof vi.fn> };

  const summary = {
    student_id: 's1',
    name: 'Eider Sánchez',
    knowledge_classification: 'average',
    profile: [
      { topic: 'POO', score: 0.8 },
      { topic: 'APIs', score: 0.4 },
    ],
    feedback: 'Buen avance en POO, reforzar APIs.',
  };

  function createComponent(): StudentProgressComponent {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        StudentProgressComponent,
        { provide: ReportsService, useValue: reportsMock },
        { provide: AuthService, useValue: authMock },
      ],
    });
    return TestBed.inject(StudentProgressComponent);
  }

  beforeEach(() => {
    reportsMock = { getStudentSummary: vi.fn().mockResolvedValue(summary) };
    authMock = { userId: vi.fn().mockReturnValue('s1') };
  });

  it('loads the summary for the logged-in student id', async () => {
    const c = createComponent();
    await Promise.resolve();
    await Promise.resolve();
    expect(reportsMock.getStudentSummary).toHaveBeenCalledWith('s1');
    expect(c.summary()?.name).toBe('Eider Sánchez');
  });

  it('shows an error when there is no userId', () => {
    authMock.userId.mockReturnValue(null);
    const c = createComponent();
    expect(reportsMock.getStudentSummary).not.toHaveBeenCalled();
    expect(c.loadError()).toContain('identificar tu usuario');
  });

  it('shows a friendly message when there is no summary yet', async () => {
    reportsMock.getStudentSummary.mockResolvedValue(null);
    const c = createComponent();
    await Promise.resolve();
    await Promise.resolve();
    expect(c.loadError()).toContain('Completá una evaluación');
  });

  it('converts score to a clamped percentage', () => {
    const c = createComponent();
    expect(c.scorePct(0.8)).toBe(80);
    expect(c.scorePct(1.5)).toBe(100);
    expect(c.scorePct(-0.2)).toBe(0);
  });

  it('translates English placeholders for classification and feedback', () => {
    const c = createComponent();
    expect(c.classificationLabel('This classification will be determined based on the student')).toBe(
      'Sin clasificación aún',
    );
    expect(c.feedbackText('This feedback will be generated based on the student')).toBeNull();
    expect(c.classificationLabel('average')).toBe('average');
    expect(c.feedbackText('Buen avance')).toBe('Buen avance');
  });

  it('captures a thrown error', async () => {
    reportsMock.getStudentSummary.mockRejectedValue(new Error('Sin conexión al servidor'));
    const c = createComponent();
    await Promise.resolve();
    await Promise.resolve();
    expect(c.loadError()).toBe('Sin conexión al servidor');
  });
});
