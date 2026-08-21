import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { StudentAssessmentComponent } from './student-assessment.component';
import { StudentAssessmentService } from '../../../core/assessments/student-assessment.service';
import { AuthService } from '../../../core/auth/auth.service';

describe('StudentAssessmentComponent', () => {
  let serviceMock: {
    getTopics: ReturnType<typeof vi.fn>;
    generateByTopic: ReturnType<typeof vi.fn>;
    saveAnswers: ReturnType<typeof vi.fn>;
    getQualificationStatus: ReturnType<typeof vi.fn>;
    getResult: ReturnType<typeof vi.fn>;
  };
  let authMock: { userId: ReturnType<typeof vi.fn> };

  function question(id: string) {
    return { question_id: id, topic: 'POO', text_to_evaluate: '¿Qué es ' + id + '?' };
  }

  function createComponent(): StudentAssessmentComponent {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        StudentAssessmentComponent,
        { provide: StudentAssessmentService, useValue: serviceMock },
        { provide: AuthService, useValue: authMock },
      ],
    });
    return TestBed.inject(StudentAssessmentComponent);
  }

  beforeEach(() => {
    serviceMock = {
      getTopics: vi.fn().mockResolvedValue(['POO', 'APIs']),
      generateByTopic: vi.fn().mockResolvedValue({
        assessmentId: 'assess-1',
        topicId: 't-1',
        questions: [question('q1'), question('q2')],
      }),
      saveAnswers: vi.fn().mockResolvedValue({ is_success: true, message: 'ok' }),
      getQualificationStatus: vi.fn().mockResolvedValue(true),
      getResult: vi.fn().mockResolvedValue({
        assessment_id: 'assess-1',
        user_id: 'u1',
        avg_score: 0.8,
        classification: 'average',
        feedback: 'Buen trabajo',
        answer_scores: [],
      }),
    };
    authMock = { userId: vi.fn().mockReturnValue('u1') };
  });

  it('loads topics on creation and preselects the first', async () => {
    const c = createComponent();
    await Promise.resolve();
    await Promise.resolve();
    expect(serviceMock.getTopics).toHaveBeenCalled();
    expect(c.topics()).toEqual(['POO', 'APIs']);
    expect(c.selectedTopic()).toBe('POO');
  });

  it('startAssessment generates and moves to answering', async () => {
    const c = createComponent();
    await Promise.resolve();
    await c.startAssessment();
    expect(serviceMock.generateByTopic).toHaveBeenCalledWith('POO', 'u1', 5);
    expect(c.step()).toBe('answering');
    expect(c.questions()).toHaveLength(2);
  });

  it('blocks starting when there is no userId', async () => {
    authMock.userId.mockReturnValue(null);
    const c = createComponent();
    await Promise.resolve();
    await c.startAssessment();
    expect(serviceMock.generateByTopic).not.toHaveBeenCalled();
    expect(c.error()).toContain('identificar tu usuario');
  });

  it('records answers and navigates between questions', async () => {
    const c = createComponent();
    await Promise.resolve();
    await c.startAssessment();
    c.onAnswerChange('respuesta 1');
    expect(c.currentAnswer()).toBe('respuesta 1');
    c.next();
    expect(c.currentIndex()).toBe(1);
    c.onAnswerChange('respuesta 2');
    c.prev();
    expect(c.currentIndex()).toBe(0);
    expect(c.currentAnswer()).toBe('respuesta 1');
  });

  it('does not submit if there are missing answers', async () => {
    const c = createComponent();
    await Promise.resolve();
    await c.startAssessment();
    c.onAnswerChange('solo la primera');
    // segunda queda vacía
    await c.submit();
    expect(serviceMock.saveAnswers).not.toHaveBeenCalled();
    expect(c.error()).toContain('falta');
  });

  it('submits, polls qualification and loads the result', async () => {
    const c = createComponent();
    await Promise.resolve();
    await c.startAssessment();
    c.onAnswerChange('r1');
    c.next();
    c.onAnswerChange('r2');

    await c.submit();

    expect(serviceMock.saveAnswers).toHaveBeenCalledTimes(1);
    const payload = serviceMock.saveAnswers.mock.calls[0][0];
    expect(payload.assessment_id).toBe('assess-1');
    expect(payload.user_id).toBe('u1');
    expect(payload.answers).toHaveLength(2);
    expect(serviceMock.getQualificationStatus).toHaveBeenCalledWith('u1', 'assess-1');
    expect(serviceMock.getResult).toHaveBeenCalledWith('u1', 'assess-1');
    expect(c.step()).toBe('result');
    expect(c.result()?.classification).toBe('average');
  });

  it('scorePct clamps to 0..100', () => {
    const c = createComponent();
    expect(c.scorePct(0.8)).toBe(80);
    expect(c.scorePct(1.4)).toBe(100);
    expect(c.scorePct(-0.3)).toBe(0);
  });

  it('restart goes back to setup and clears state', async () => {
    const c = createComponent();
    await Promise.resolve();
    await c.startAssessment();
    c.restart();
    expect(c.step()).toBe('setup');
    expect(c.questions()).toEqual([]);
    expect(c.result()).toBeNull();
  });
});
