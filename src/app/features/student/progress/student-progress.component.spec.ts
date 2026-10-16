import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { StudentProgressComponent } from './student-progress.component';
import { ReportsService } from '../../../core/reports/reports.service';
import { AuthService } from '../../../core/auth/auth.service';

describe('StudentProgressComponent', () => {
  let reportsMock: { getStudentSummary: ReturnType<typeof vi.fn>; getStudentProgress: ReturnType<typeof vi.fn> };
  let authMock: { userId: ReturnType<typeof vi.fn> };

  const summary = {
    student_id: 's1',
    name: 'Eider Sánchez',
    knowledge_classification: 'average',
    profile: [
      { topic: 'POO', score: 80 },
      { topic: 'APIs', score: 40 },
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
    reportsMock = {
      getStudentSummary: vi.fn().mockResolvedValue(summary),
      getStudentProgress: vi.fn().mockResolvedValue({
        student_id: 's1',
        classification: 'básico',
        knowledge_profile: [
          { topic: 'POO', score: 40, index: 0 },
          { topic: 'POO', score: 80, index: 1 },
          { topic: 'APIs', score: 40, index: 0 },
        ],
      }),
    };
    authMock = { userId: vi.fn().mockReturnValue('s1') };
  });

  it('loads the summary for the logged-in student id', async () => {
    const c = createComponent();
    await new Promise((r) => setTimeout(r));
    await new Promise((r) => setTimeout(r));
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
    await new Promise((r) => setTimeout(r));
    await new Promise((r) => setTimeout(r));
    expect(c.loadError()).toContain('Completa una evaluación');
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
    await new Promise((r) => setTimeout(r));
    await new Promise((r) => setTimeout(r));
    expect(c.loadError()).toBe('Sin conexión al servidor');
  });

  it('builds one line per topic from the progress history', async () => {
    const c = createComponent();
    await new Promise((r) => setTimeout(r));
    expect(reportsMock.getStudentProgress).toHaveBeenCalledWith('s1');
    expect(c.progressSeries().map((x) => x.key)).toEqual(['POO', 'APIs']);
    expect(c.progressSeries()[0]!.points.map((p) => p.value)).toEqual([40, 80]);
  });

  it('gives each profile bar the color of its line', async () => {
    const c = createComponent();
    await new Promise((r) => setTimeout(r));
    const colors = new Map(c.progressSeries().map((x) => [x.key, x.color]));
    expect(c.profileItems().map((i) => [i.key, i.value, i.color])).toEqual([
      ['POO', 80, colors.get('POO')],
      ['APIs', 40, colors.get('APIs')],
    ]);
  });

  it('keeps the summary working when the progress history cannot be loaded', async () => {
    reportsMock.getStudentProgress.mockRejectedValue(new Error('boom'));
    const c = createComponent();
    await new Promise((r) => setTimeout(r));
    expect(c.summary()?.name).toBe('Eider Sánchez');
    expect(c.loadError()).toBeNull();
    expect(c.progressSeries()).toEqual([]);
  });

  it('derives the medal from the classification', async () => {
    reportsMock.getStudentSummary.mockResolvedValue({ ...summary, knowledge_classification: 'Intermedio' });
    const c = createComponent();
    await new Promise((r) => setTimeout(r));
    expect(c.medal()?.rank).toBe(2);
  });

  it('has no medal while the classification is only a placeholder', async () => {
    const c = createComponent();
    await new Promise((r) => setTimeout(r));
    expect(c.medal()).toBeNull();
  });
});
