import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { StudentAssessmentComponent } from './student-assessment.component';
import { StudentAssessmentService } from '../../../core/assessments/student-assessment.service';
import { AuthService } from '../../../core/auth/auth.service';
import { ToastService } from '../../../shared/ui/toast/toast.service';

describe('StudentAssessmentComponent', () => {
  let serviceMock: {
    getTopics: ReturnType<typeof vi.fn>;
    generateByTopic: ReturnType<typeof vi.fn>;
    saveAnswers: ReturnType<typeof vi.fn>;
    getQualificationStatus: ReturnType<typeof vi.fn>;
    getResult: ReturnType<typeof vi.fn>;
    getAssessmentsSummary: ReturnType<typeof vi.fn>;
  };
  let authMock: { userId: ReturnType<typeof vi.fn> };

  function question(id: string) {
    return { question_id: id, topic: 'POO', text_to_evaluate: '¿Qué es ' + id + '?' };
  }

  const toastMock = { success: vi.fn(), error: vi.fn(), info: vi.fn(), warning: vi.fn() };

  function createComponent(): StudentAssessmentComponent {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        StudentAssessmentComponent,
        { provide: StudentAssessmentService, useValue: serviceMock },
        { provide: AuthService, useValue: authMock },
        { provide: ToastService, useValue: toastMock },
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
      getAssessmentsSummary: vi.fn().mockResolvedValue([
        { assessment_id: 'assess-1', score: 0.8, date_taken: '2026-01-01', classification: 'average', feedback: 'ok' },
      ]),
    };
    authMock = { userId: vi.fn().mockReturnValue('u1') };
  });

  it('starts on the history step and loads the summary', async () => {
    const c = createComponent();
    await Promise.resolve();
    await Promise.resolve();
    expect(c.step()).toBe('history');
    expect(serviceMock.getAssessmentsSummary).toHaveBeenCalledWith('u1');
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
    expect(serviceMock.generateByTopic).toHaveBeenCalledWith('POO', 'u1');
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
    expect(c.draft()).toBe('respuesta 1');
    c.next();
    expect(c.currentIndex()).toBe(1);
    c.onAnswerChange('respuesta 2');
    c.prev();
    expect(c.currentIndex()).toBe(0);
    expect(c.draft()).toBe('respuesta 1');
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
    // Al terminar la calificación se muestra el historial (punto 8).
    expect(serviceMock.getAssessmentsSummary).toHaveBeenCalledWith('u1');
    expect(c.step()).toBe('history');
    expect(c.history()).toHaveLength(1);

    // Al clickear una evaluación del historial se carga su detalle.
    await c.viewResult('assess-1');
    expect(serviceMock.getResult).toHaveBeenCalledWith('u1', 'assess-1');
    expect(c.step()).toBe('result');
    expect(c.result()?.classification).toBe('average');
  });

  it('draft reflects each question answer when navigating (fix punto 5)', async () => {
    const c = createComponent();
    await Promise.resolve();
    await c.startAssessment();
    // Q1
    c.onAnswerChange('respuesta 1');
    expect(c.draft()).toBe('respuesta 1');
    c.next();
    // Q2 arranca vacía (no muestra el texto de Q1)
    expect(c.draft()).toBe('');
    c.onAnswerChange('respuesta 2');
    expect(c.draft()).toBe('respuesta 2');
    // volver a Q1 muestra su respuesta guardada
    c.prev();
    expect(c.draft()).toBe('respuesta 1');
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

  it('prevents clipboard actions and warns via toast', () => {
    const c = createComponent();
    const event = { preventDefault: vi.fn() } as unknown as Event;
    c.blockClipboard(event, 'pegar');
    expect(event.preventDefault).toHaveBeenCalled();
    expect(toastMock.warning).toHaveBeenCalled();
  });

  it('prevents the context menu', () => {
    const c = createComponent();
    const event = { preventDefault: vi.fn() } as unknown as Event;
    c.blockContextMenu(event);
    expect(event.preventDefault).toHaveBeenCalled();
  });

  const flush = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

  /** Crea el componente, espera la carga inicial y empieza una evaluación. */
  async function started(): Promise<StudentAssessmentComponent> {
    const c = createComponent();
    await flush();
    await c.startAssessment();
    return c;
  }

  /** Responde todas las preguntas de la evaluación en curso. */
  function answerAll(c: StudentAssessmentComponent): void {
    c.onAnswerChange('r1');
    c.next();
    c.onAnswerChange('r2');
  }

  describe('loading topics', () => {
    it('shows the error message when loading the topics fails', async () => {
      serviceMock.getTopics.mockRejectedValue(new Error('Sin conexión al servidor'));
      const c = createComponent();
      await flush();
      expect(c.error()).toBe('Sin conexión al servidor');
      expect(c.isLoadingTopics()).toBe(false);
    });

    it('uses a generic message when loading topics throws something that is not an Error', async () => {
      serviceMock.getTopics.mockRejectedValue('boom');
      const c = createComponent();
      await flush();
      expect(c.error()).toBe('Error al cargar los temas');
    });

    it('does not preselect a topic when there are none', async () => {
      serviceMock.getTopics.mockResolvedValue([]);
      const c = createComponent();
      await flush();
      expect(c.selectedTopic()).toBe('');
    });
  });

  describe('startAssessment', () => {
    it('asks to pick a topic when none is selected', async () => {
      serviceMock.getTopics.mockResolvedValue([]);
      const c = createComponent();
      await flush();
      await c.startAssessment();
      expect(c.error()).toBe('Elegí un tema para comenzar.');
      expect(serviceMock.generateByTopic).not.toHaveBeenCalled();
    });

    it('reports when the topic has no questions and stays on the same step', async () => {
      serviceMock.generateByTopic.mockResolvedValue({ assessmentId: 'a', topicId: null, questions: [] });
      const c = createComponent();
      await flush();
      await c.startAssessment();
      expect(c.error()).toBe('No hay preguntas disponibles para este tema.');
      expect(c.step()).toBe('history');
      expect(c.isBusy()).toBe(false);
    });

    it('shows the error message when generating the assessment fails', async () => {
      serviceMock.generateByTopic.mockRejectedValue(new Error('Datos inválidos'));
      const c = createComponent();
      await flush();
      await c.startAssessment();
      expect(c.error()).toBe('Datos inválidos');
      expect(c.isBusy()).toBe(false);
    });

    it('uses a generic message when generating throws something that is not an Error', async () => {
      serviceMock.generateByTopic.mockRejectedValue('boom');
      const c = createComponent();
      await flush();
      await c.startAssessment();
      expect(c.error()).toBe('No se pudo iniciar la evaluación');
    });

    it('starts from the first question with an empty draft', async () => {
      const c = await started();
      expect(c.currentIndex()).toBe(0);
      expect(c.draft()).toBe('');
      expect(c.error()).toBeNull();
      expect(c.progressLabel()).toBe('Pregunta 1 de 2');
      expect(c.currentQuestion()?.question_id).toBe('q1');
    });
  });

  describe('navigation', () => {
    it('does not go past the last question', async () => {
      const c = await started();
      c.next();
      expect(c.isLastQuestion()).toBe(true);
      c.next();
      expect(c.currentIndex()).toBe(1);
    });

    it('does not go before the first question', async () => {
      const c = await started();
      c.prev();
      expect(c.currentIndex()).toBe(0);
    });

    it('keeps the draft when there is no current question', () => {
      const c = createComponent();
      c.onAnswerChange('texto suelto');
      expect(c.draft()).toBe('texto suelto');
      expect(c.currentQuestion()).toBeNull();
    });

    it('allAnswered is false until answers are given', async () => {
      const c = await started();
      expect(c.allAnswered()).toBe(false);
    });
  });

  describe('time tracking', () => {
    it('sends the seconds spent on each question', async () => {
      const clock = vi.spyOn(Date, 'now');
      try {
        clock.mockReturnValue(1_000_000);
        const c = await started();
        c.onAnswerChange('r1');
        clock.mockReturnValue(1_005_000);
        c.next();
        c.onAnswerChange('r2');
        clock.mockReturnValue(1_009_000);

        await c.submit();

        const answers = serviceMock.saveAnswers.mock.calls[0]![0].answers;
        expect(answers[0]).toMatchObject({ question_id: 'q1', answer: 'r1', takes_time_seconds: 5 });
        expect(answers[1]).toMatchObject({ question_id: 'q2', answer: 'r2', takes_time_seconds: 4 });
      } finally {
        clock.mockRestore();
      }
    });
  });

  describe('submit', () => {
    it('refuses to submit without a logged-in user', async () => {
      const c = await started();
      authMock.userId.mockReturnValue(null);
      await c.submit();
      expect(c.error()).toBe('No se pudo enviar la evaluación. Iniciá sesión de nuevo.');
      expect(serviceMock.saveAnswers).not.toHaveBeenCalled();
    });

    it('refuses to submit when no assessment was started', async () => {
      const c = createComponent();
      await flush();
      await c.submit();
      expect(c.error()).toBe('No se pudo enviar la evaluación. Iniciá sesión de nuevo.');
    });

    it('counts the missing answers', async () => {
      const c = await started();
      await c.submit();
      expect(c.error()).toBe('Te faltan 2 respuesta(s) por completar.');
    });

    it('trims the answers before sending them', async () => {
      const c = await started();
      c.onAnswerChange('  r1  ');
      c.next();
      c.onAnswerChange(' r2 ');
      await c.submit();
      const answers = serviceMock.saveAnswers.mock.calls[0]![0].answers;
      expect(answers.map((a: { answer: string }) => a.answer)).toEqual(['r1', 'r2']);
    });

    it('shows the backend message when the answers are not saved', async () => {
      serviceMock.saveAnswers.mockResolvedValue({ is_success: false, message: 'Evaluación cerrada' });
      const c = await started();
      answerAll(c);
      await c.submit();
      expect(c.error()).toBe('Evaluación cerrada');
      expect(c.step()).toBe('answering');
      expect(c.isBusy()).toBe(false);
    });

    it('uses a default message when the backend gives none', async () => {
      serviceMock.saveAnswers.mockResolvedValue({ is_success: false, message: '' });
      const c = await started();
      answerAll(c);
      await c.submit();
      expect(c.error()).toBe('No se pudieron guardar las respuestas');
    });

    it('goes back to answering when saving throws', async () => {
      serviceMock.saveAnswers.mockRejectedValue(new Error('Sin conexión al servidor'));
      const c = await started();
      answerAll(c);
      await c.submit();
      expect(c.error()).toBe('Sin conexión al servidor');
      expect(c.step()).toBe('answering');
      expect(c.isBusy()).toBe(false);
    });

    it('uses a generic message when saving throws something that is not an Error', async () => {
      serviceMock.saveAnswers.mockRejectedValue('boom');
      const c = await started();
      answerAll(c);
      await c.submit();
      expect(c.error()).toBe('Error al enviar la evaluación');
    });
  });

  describe('grading poll', () => {
    beforeEach(() => vi.useFakeTimers());
    afterEach(() => vi.useRealTimers());

    async function startedWithTimers(): Promise<StudentAssessmentComponent> {
      const c = createComponent();
      await vi.advanceTimersByTimeAsync(0);
      await c.startAssessment();
      answerAll(c);
      return c;
    }

    it('keeps polling until the grade is ready', async () => {
      serviceMock.getQualificationStatus
        .mockResolvedValueOnce(false)
        .mockResolvedValueOnce(false)
        .mockResolvedValueOnce(true);
      const c = await startedWithTimers();

      const done = c.submit();
      await vi.advanceTimersByTimeAsync(3000 * 3);
      await done;

      expect(serviceMock.getQualificationStatus).toHaveBeenCalledTimes(3);
      expect(c.step()).toBe('history');
    });

    it('retries silently when a poll fails', async () => {
      serviceMock.getQualificationStatus
        .mockRejectedValueOnce(new Error('boom'))
        .mockResolvedValueOnce(true);
      const c = await startedWithTimers();

      const done = c.submit();
      await vi.advanceTimersByTimeAsync(3000 * 2);
      await done;

      expect(serviceMock.getQualificationStatus).toHaveBeenCalledTimes(2);
      expect(c.step()).toBe('history');
      expect(c.error()).toBeNull();
    });

    it('tells the student the grading is taking longer than expected after too many polls', async () => {
      serviceMock.getQualificationStatus.mockResolvedValue(false);
      const c = await startedWithTimers();

      const done = c.submit();
      await vi.advanceTimersByTimeAsync(3000 * 41);
      await done;

      expect(serviceMock.getQualificationStatus).toHaveBeenCalledTimes(40);
      expect(c.step()).toBe('grading');
      expect(c.gradingMessage()).toContain('tardando más de lo esperado');
    });
  });

  describe('history', () => {
    it('does not load the history without a user', async () => {
      authMock.userId.mockReturnValue(null);
      const c = createComponent();
      await flush();
      expect(serviceMock.getAssessmentsSummary).not.toHaveBeenCalled();
      expect(c.history()).toEqual([]);
    });

    it('leaves the history empty when loading it fails', async () => {
      serviceMock.getAssessmentsSummary.mockRejectedValue(new Error('boom'));
      const c = createComponent();
      await flush();
      expect(c.history()).toEqual([]);
      expect(c.isLoadingHistory()).toBe(false);
    });

    it('openHistory clears the error, reloads and shows the history', async () => {
      const c = createComponent();
      await flush();
      c.restart();
      c.error.set('un error previo');

      await c.openHistory();

      expect(c.error()).toBeNull();
      expect(c.step()).toBe('history');
      expect(c.history()).toHaveLength(1);
    });
  });

  describe('viewResult', () => {
    it('does nothing without a user', async () => {
      const c = createComponent();
      await flush();
      authMock.userId.mockReturnValue(null);
      await c.viewResult('assess-1');
      expect(serviceMock.getResult).not.toHaveBeenCalled();
    });

    it('warns when there is no detail for the assessment', async () => {
      serviceMock.getResult.mockResolvedValue(null);
      const c = createComponent();
      await flush();
      await c.viewResult('assess-1');
      expect(toastMock.warning).toHaveBeenCalledWith('Sin detalle', expect.any(String));
      expect(c.step()).toBe('history');
      expect(c.isBusy()).toBe(false);
    });

    it('shows an error toast when loading the detail fails', async () => {
      serviceMock.getResult.mockRejectedValue(new Error('No se encontró la evaluación'));
      const c = createComponent();
      await flush();
      await c.viewResult('assess-1');
      expect(toastMock.error).toHaveBeenCalledWith(
        'No se pudo cargar el resultado',
        'No se encontró la evaluación',
      );
    });

    it('uses a generic message when the detail fails with something that is not an Error', async () => {
      serviceMock.getResult.mockRejectedValue('boom');
      const c = createComponent();
      await flush();
      await c.viewResult('assess-1');
      expect(toastMock.error).toHaveBeenCalledWith('No se pudo cargar el resultado', 'Error inesperado');
    });

    it('backToHistory clears the result and returns to the history', async () => {
      const c = createComponent();
      await flush();
      await c.viewResult('assess-1');
      expect(c.step()).toBe('result');

      c.backToHistory();

      expect(c.result()).toBeNull();
      expect(c.step()).toBe('history');
    });
  });

  describe('helpers', () => {
    it('formatDate formats a valid date and keeps an invalid one as it came', () => {
      const c = createComponent();
      expect(c.formatDate('2026-01-15T10:00:00')).toBe(new Date('2026-01-15T10:00:00').toLocaleDateString());
      expect(c.formatDate('no es una fecha')).toBe('no es una fecha');
    });

    it('restart restores the grading message', async () => {
      const c = createComponent();
      c.gradingMessage.set('otro mensaje');
      c.restart();
      expect(c.gradingMessage()).toBe('Estamos calificando tus respuestas…');
    });

    it('blockClipboard names the blocked action in the warning', () => {
      const c = createComponent();
      c.blockClipboard({ preventDefault: vi.fn() } as unknown as Event, 'copiar');
      expect(toastMock.warning).toHaveBeenLastCalledWith(
        'Acción no permitida',
        expect.stringContaining('copiar'),
      );
    });
  });
});
