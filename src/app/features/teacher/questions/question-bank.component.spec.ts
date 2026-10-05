import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { QuestionBankComponent } from './question-bank.component';
import { AssessmentsService } from '../../../core/assessments/assessments.service';
import { ToastService } from '../../../shared/ui/toast/toast.service';

describe('QuestionBankComponent', () => {
  let serviceMock: {
    getAllQuestions: ReturnType<typeof vi.fn>;
    getQuestionsByLevel: ReturnType<typeof vi.fn>;
    getQuestionsByCategory: ReturnType<typeof vi.fn>;
    getQuestionById: ReturnType<typeof vi.fn>;
    getCategories: ReturnType<typeof vi.fn>;
    updateQuestionStatus: ReturnType<typeof vi.fn>;
  };
  const toastMock = { success: vi.fn(), error: vi.fn(), info: vi.fn(), warning: vi.fn() };

  function listItem(id: string) {
    return {
      question_id: id,
      text_to_evaluate: 'texto ' + id,
      difficulty: 'básico',
      classification: 'Fundamentos y paradigmas',
      status: 'published',
    };
  }

  function createComponent(): QuestionBankComponent {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        QuestionBankComponent,
        { provide: AssessmentsService, useValue: serviceMock },
        { provide: ToastService, useValue: toastMock },
      ],
    });
    return TestBed.inject(QuestionBankComponent);
  }

  beforeEach(() => {
    serviceMock = {
      getAllQuestions: vi.fn().mockResolvedValue({ questions: [], total: 0 }),
      getQuestionsByLevel: vi.fn(),
      getQuestionsByCategory: vi.fn(),
      getQuestionById: vi.fn(),
      getCategories: vi.fn().mockResolvedValue([]),
      updateQuestionStatus: vi
        .fn()
        .mockResolvedValue({ is_success: true, message: 'ok', question_id: 'q1', new_status: false }),
    };
    toastMock.success.mockClear();
    toastMock.error.mockClear();
  });

  it('starts in "all" mode and loads the paginated list', async () => {
    serviceMock.getAllQuestions.mockResolvedValue({ questions: [listItem('q1')], total: 1 });
    const component = createComponent();
    await Promise.resolve();
    await Promise.resolve();

    expect(component.mode()).toBe('all');
    expect(serviceMock.getAllQuestions).toHaveBeenCalledWith(0, 10);
    expect(component.rows()).toHaveLength(1);
    expect(component.total()).toBe(1);
  });

  it('maps difficulty and classification into the row', async () => {
    serviceMock.getAllQuestions.mockResolvedValue({ questions: [listItem('q1')], total: 1 });
    const component = createComponent();
    await Promise.resolve();
    await Promise.resolve();

    const row = component.rows()[0]!;
    expect(row.difficulty).toBe('básico');
    expect(row.category).toBe('Fundamentos y paradigmas');
  });

  it('computes totalPages from total and page size', async () => {
    serviceMock.getAllQuestions.mockResolvedValue({ questions: [listItem('q1')], total: 25 });
    const component = createComponent();
    await Promise.resolve();
    await Promise.resolve();

    expect(component.totalPages()).toBe(3);
  });

  it('nextPage loads the following page', async () => {
    serviceMock.getAllQuestions.mockResolvedValue({ questions: [listItem('q1')], total: 25 });
    const component = createComponent();
    await Promise.resolve();
    await Promise.resolve();

    await component.nextPage();

    expect(serviceMock.getAllQuestions).toHaveBeenLastCalledWith(1, 10);
    expect(component.page()).toBe(1);
  });

  it('prevPage does nothing on the first page', async () => {
    serviceMock.getAllQuestions.mockResolvedValue({ questions: [], total: 5 });
    const component = createComponent();
    await Promise.resolve();
    serviceMock.getAllQuestions.mockClear();

    await component.prevPage();

    expect(serviceMock.getAllQuestions).not.toHaveBeenCalled();
  });

  it('switching to level mode and searching calls getQuestionsByLevel', async () => {
    const component = createComponent();
    await Promise.resolve();
    serviceMock.getQuestionsByLevel.mockResolvedValue([
      { question_id: 'q9', text_to_evaluate: 'texto' },
    ]);

    component.setMode('level');
    await component.search();

    expect(serviceMock.getQuestionsByLevel).toHaveBeenCalledWith('básico');
    expect(component.rows()[0]?.difficulty).toBe('básico');
    expect(component.rows()[0]?.category).toBeNull();
  });

  it('switching back to "all" reloads the full list', async () => {
    const component = createComponent();
    await Promise.resolve();
    component.setMode('level');
    serviceMock.getAllQuestions.mockClear();

    component.setMode('all');
    await Promise.resolve();

    expect(component.mode()).toBe('all');
    expect(serviceMock.getAllQuestions).toHaveBeenCalledWith(0, 10);
  });

  it('captures the error and clears the list on failure', async () => {
    serviceMock.getAllQuestions.mockRejectedValue(new Error('No tienes permisos'));
    const component = createComponent();
    await Promise.resolve();
    await Promise.resolve();

    expect(component.rows()).toEqual([]);
    expect(component.listError()).toBe('No tienes permisos');
  });

  it('opens the modal and loads the question detail', async () => {
    const detail = {
      question_id: 'q1',
      text: 't',
      concept: 'c',
      definition: 'd',
      simple_explanation: 's',
      correct_sample: 'ok',
      wrong_sample: 'bad',
      common_misconception: ['a', 'b'],
      rubric: [{ score: 3, explanation: 'e' }],
      semantic_keywords: ['k'],
      status: 'published',
    };
    serviceMock.getQuestionById.mockResolvedValue(detail);
    const component = createComponent();
    await Promise.resolve();

    await component.selectQuestion('q1');

    expect(serviceMock.getQuestionById).toHaveBeenCalledWith('q1');
    expect(component.detail()).toEqual(detail);
    expect(component.isDetailOpen()).toBe(true);
  });

  it('closeDetail hides the modal', async () => {
    serviceMock.getQuestionById.mockResolvedValue(null);
    const component = createComponent();
    await Promise.resolve();
    await component.selectQuestion('q1');

    component.closeDetail();

    expect(component.isDetailOpen()).toBe(false);
  });

  it('loads categories from the backend', async () => {
    serviceMock.getCategories.mockResolvedValue(['Cat A', 'Cat B']);
    const component = createComponent();
    await Promise.resolve();
    await Promise.resolve();

    expect(component.categories()).toEqual(['Cat A', 'Cat B']);
  });

  const flush = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

  describe('labels', () => {
    it.each([
      ['easy', 'Básico'],
      ['medium', 'Intermedio'],
      ['hard', 'Avanzado'],
      ['básico', 'Básico'],
      ['INTERMEDIO', 'Intermedio'],
      ['avanzado', 'Avanzado'],
      ['otro', 'otro'],
    ])('difficultyLabel("%s") is "%s"', (value, label) => {
      expect(createComponent().difficultyLabel(value)).toBe(label);
    });

    it('difficultyLabel handles a missing value', () => {
      expect(createComponent().difficultyLabel(null)).toBe('Sin dificultad');
    });

    it('categoryLabel falls back to "Sin clasificar" for empty or blank values', () => {
      const c = createComponent();
      expect(c.categoryLabel(null)).toBe('Sin clasificar');
      expect(c.categoryLabel('   ')).toBe('Sin clasificar');
      expect(c.categoryLabel('Fundamentos')).toBe('Fundamentos');
    });

    it.each([
      ['draft', 'Borrador'],
      ['published', 'Publicada'],
      ['ARCHIVED', 'Archivada'],
      ['otro', 'otro'],
    ])('statusLabel("%s") is "%s"', (value, label) => {
      expect(createComponent().statusLabel(value)).toBe(label);
    });

    it('statusLabel handles a missing value', () => {
      expect(createComponent().statusLabel(null)).toBe('Sin estado');
    });
  });

  describe('list loading', () => {
    it('falls back to null when the backend omits difficulty, classification or status', async () => {
      serviceMock.getAllQuestions.mockResolvedValue({
        questions: [{ question_id: 'q1', text_to_evaluate: 'texto' }],
        total: 1,
      });
      const c = createComponent();
      await flush();

      expect(c.rows()[0]).toEqual({
        question_id: 'q1',
        text: 'texto',
        difficulty: null,
        category: null,
        status: null,
      });
    });

    it('uses a generic message when the list fails with something that is not an Error', async () => {
      serviceMock.getAllQuestions.mockRejectedValue('boom');
      const c = createComponent();
      await flush();

      expect(c.listError()).toBe('Error inesperado');
      expect(c.isLoadingList()).toBe(false);
    });

    it('has zero pages when there are no questions', async () => {
      const c = createComponent();
      await flush();
      expect(c.totalPages()).toBe(0);
    });

    it('keeps the local categories when the backend returns none', async () => {
      const c = createComponent();
      const fallback = c.categories();
      await flush();
      expect(c.categories()).toEqual(fallback);
    });

    it('keeps the local categories when loading them fails', async () => {
      serviceMock.getCategories.mockRejectedValue(new Error('boom'));
      const c = createComponent();
      const fallback = c.categories();
      await flush();
      expect(c.categories()).toEqual(fallback);
    });
  });

  describe('filters', () => {
    it('setMode does nothing when the mode does not change', async () => {
      const c = createComponent();
      await flush();
      serviceMock.getAllQuestions.mockClear();

      c.setMode('all');
      await flush();

      expect(serviceMock.getAllQuestions).not.toHaveBeenCalled();
    });

    it('setMode("level") preselects the first difficulty', async () => {
      const c = createComponent();
      await flush();
      c.setMode('level');
      expect(c.mode()).toBe('level');
      expect(c.selectedValue()).toBe(c.difficulties[0]);
    });

    it('setMode("category") preselects the first category', async () => {
      serviceMock.getCategories.mockResolvedValue(['Cat A', 'Cat B']);
      const c = createComponent();
      await flush();
      c.setMode('category');
      expect(c.mode()).toBe('category');
      expect(c.selectedValue()).toBe('Cat A');
    });

    it('onValueChange updates the selected value', () => {
      const c = createComponent();
      c.onValueChange('avanzado');
      expect(c.selectedValue()).toBe('avanzado');
    });

    it('search in category mode calls getQuestionsByCategory and maps the rows', async () => {
      serviceMock.getCategories.mockResolvedValue(['Cat A']);
      const c = createComponent();
      await flush();
      serviceMock.getQuestionsByCategory.mockResolvedValue([
        { question_id: 'q7', text_to_evaluate: 'texto 7' },
        { question_id: 'q8', text_to_evaluate: 'texto 8' },
      ]);

      c.setMode('category');
      await c.search();

      expect(serviceMock.getQuestionsByCategory).toHaveBeenCalledWith('Cat A');
      expect(c.rows()).toHaveLength(2);
      expect(c.rows()[0]).toMatchObject({ category: 'Cat A', difficulty: null, status: null });
      expect(c.total()).toBe(2);
      expect(c.page()).toBe(0);
    });

    it('search in "all" mode reloads the full list', async () => {
      const c = createComponent();
      await flush();
      serviceMock.getAllQuestions.mockClear();

      await c.search();

      expect(serviceMock.getAllQuestions).toHaveBeenCalledWith(0, 10);
    });

    it('search captures the error and clears the rows', async () => {
      const c = createComponent();
      await flush();
      serviceMock.getQuestionsByLevel.mockRejectedValue(new Error('Sin conexión'));

      c.setMode('level');
      await c.search();

      expect(c.rows()).toEqual([]);
      expect(c.total()).toBe(0);
      expect(c.listError()).toBe('Sin conexión');
    });

    it('search uses a generic message for errors that are not an Error', async () => {
      const c = createComponent();
      await flush();
      serviceMock.getQuestionsByLevel.mockRejectedValue('boom');

      c.setMode('level');
      await c.search();

      expect(c.listError()).toBe('Error inesperado');
    });
  });

  describe('pagination', () => {
    it('nextPage does nothing on the last page', async () => {
      serviceMock.getAllQuestions.mockResolvedValue({ questions: [listItem('q1')], total: 5 });
      const c = createComponent();
      await flush();
      serviceMock.getAllQuestions.mockClear();

      await c.nextPage();

      expect(serviceMock.getAllQuestions).not.toHaveBeenCalled();
    });

    it('nextPage does nothing outside "all" mode', async () => {
      serviceMock.getAllQuestions.mockResolvedValue({ questions: [listItem('q1')], total: 25 });
      const c = createComponent();
      await flush();
      c.setMode('level');
      serviceMock.getAllQuestions.mockClear();

      await c.nextPage();

      expect(serviceMock.getAllQuestions).not.toHaveBeenCalled();
    });

    it('prevPage goes back one page', async () => {
      serviceMock.getAllQuestions.mockResolvedValue({ questions: [listItem('q1')], total: 25 });
      const c = createComponent();
      await flush();
      await c.nextPage();

      await c.prevPage();

      expect(serviceMock.getAllQuestions).toHaveBeenLastCalledWith(0, 10);
      expect(c.page()).toBe(0);
    });

    it('prevPage does nothing outside "all" mode', async () => {
      serviceMock.getAllQuestions.mockResolvedValue({ questions: [listItem('q1')], total: 25 });
      const c = createComponent();
      await flush();
      await c.nextPage();
      c.setMode('level');
      serviceMock.getAllQuestions.mockClear();

      await c.prevPage();

      expect(serviceMock.getAllQuestions).not.toHaveBeenCalled();
    });
  });

  describe('detail', () => {
    it('does not reload the detail when the same question is selected again', async () => {
      serviceMock.getQuestionById.mockResolvedValue({ question_id: 'q1' });
      const c = createComponent();
      await flush();

      await c.selectQuestion('q1');
      c.closeDetail();
      await c.selectQuestion('q1');

      expect(serviceMock.getQuestionById).toHaveBeenCalledTimes(1);
      expect(c.isDetailOpen()).toBe(true);
    });

    it('shows a message when the detail is not found', async () => {
      serviceMock.getQuestionById.mockResolvedValue(null);
      const c = createComponent();
      await flush();

      await c.selectQuestion('q1');

      expect(c.detail()).toBeNull();
      expect(c.detailError()).toBe('No se encontró el detalle de la pregunta');
      expect(c.isLoadingDetail()).toBe(false);
    });

    it('captures the error message when loading the detail fails', async () => {
      serviceMock.getQuestionById.mockRejectedValue(new Error('No tienes permisos'));
      const c = createComponent();
      await flush();

      await c.selectQuestion('q1');

      expect(c.detailError()).toBe('No tienes permisos');
    });

    it('uses a generic message when the detail fails with something that is not an Error', async () => {
      serviceMock.getQuestionById.mockRejectedValue('boom');
      const c = createComponent();
      await flush();

      await c.selectQuestion('q1');

      expect(c.detailError()).toBe('Error inesperado');
    });
  });
  describe('disable question', () => {
    async function loaded(items: string[], total = items.length, page = 0) {
      serviceMock.getAllQuestions.mockResolvedValue({ questions: items.map(listItem), total });
      const component = createComponent();
      await Promise.resolve();
      await Promise.resolve();
      if (page > 0) {
        await component.nextPage();
      }
      return component;
    }

    it('asks for confirmation first and can cancel without calling the backend', async () => {
      const component = await loaded(['q1', 'q2']);
      component.askDisable('q1');
      expect(component.confirmingId()).toBe('q1');
      component.cancelDisable();
      expect(component.confirmingId()).toBeNull();
      expect(serviceMock.updateQuestionStatus).not.toHaveBeenCalled();
    });

    it('exposes the question being confirmed for the modal', async () => {
      const component = await loaded(['q1', 'q2']);
      expect(component.confirmingQuestion()).toBeNull();
      component.askDisable('q2');
      expect(component.confirmingQuestion()?.question_id).toBe('q2');
      expect(component.confirmingQuestion()?.text).toBe('texto q2');
    });

    it('Escape closes the confirmation modal without disabling', async () => {
      const component = await loaded(['q1']);
      component.askDisable('q1');
      component.onEscape();
      expect(component.confirmingId()).toBeNull();
      expect(serviceMock.updateQuestionStatus).not.toHaveBeenCalled();
    });

    it('cannot cancel the modal while the question is being disabled', async () => {
      const component = await loaded(['q1']);
      let release!: (v: unknown) => void;
      serviceMock.updateQuestionStatus.mockReturnValue(new Promise((r) => (release = r)));
      component.askDisable('q1');

      const pending = component.disableQuestion('q1');
      component.cancelDisable();
      component.onEscape();
      expect(component.confirmingId()).toBe('q1');

      release({ is_success: true, message: 'ok', question_id: 'q1', new_status: false });
      await pending;
      expect(component.confirmingId()).toBeNull();
    });

    it('disables the question, notifies and reloads the current page', async () => {
      const component = await loaded(['q1', 'q2'], 2);
      serviceMock.getAllQuestions.mockClear();
      component.askDisable('q1');

      await component.disableQuestion('q1');

      expect(serviceMock.updateQuestionStatus).toHaveBeenCalledWith('q1', false);
      expect(toastMock.success).toHaveBeenCalled();
      expect(serviceMock.getAllQuestions).toHaveBeenCalledWith(0, 10);
      expect(component.confirmingId()).toBeNull();
      expect(component.disablingId()).toBeNull();
    });

    it('goes back one page when the last row of a page is disabled', async () => {
      const component = await loaded(['q1'], 11);
      await component.nextPage();
      expect(component.page()).toBe(1);
      serviceMock.getAllQuestions.mockClear();

      await component.disableQuestion('q1');

      expect(serviceMock.getAllQuestions).toHaveBeenCalledWith(0, 10);
    });

    it('only removes the row locally when a filter is active', async () => {
      const component = await loaded(['q1']);
      serviceMock.getQuestionsByLevel.mockResolvedValue([
        { question_id: 'q1', text_to_evaluate: 'a' },
        { question_id: 'q2', text_to_evaluate: 'b' },
      ]);
      component.setMode('level');
      await component.search();
      serviceMock.getAllQuestions.mockClear();

      await component.disableQuestion('q1');

      expect(serviceMock.getAllQuestions).not.toHaveBeenCalled();
      expect(component.rows().map((r) => r.question_id)).toEqual(['q2']);
      expect(component.total()).toBe(1);
    });

    it('closes the detail when the open question is disabled', async () => {
      const component = await loaded(['q1']);
      serviceMock.getQuestionById.mockResolvedValue({ question_id: 'q1' });
      await component.selectQuestion('q1');
      expect(component.isDetailOpen()).toBe(true);

      await component.disableQuestion('q1');

      expect(component.isDetailOpen()).toBe(false);
      expect(component.selectedId()).toBeNull();
    });

    it('shows an error toast and keeps the row when the backend rejects the change', async () => {
      const component = await loaded(['q1']);
      serviceMock.updateQuestionStatus.mockRejectedValue(new Error('No tienes permisos'));
      serviceMock.getAllQuestions.mockClear();

      await component.disableQuestion('q1');

      expect(toastMock.error).toHaveBeenCalledWith('No se pudo desactivar la pregunta', 'No tienes permisos');
      expect(serviceMock.getAllQuestions).not.toHaveBeenCalled();
      expect(component.disablingId()).toBeNull();
    });

    it('treats is_success false as an error', async () => {
      const component = await loaded(['q1']);
      serviceMock.updateQuestionStatus.mockResolvedValue({
        is_success: false,
        message: 'Pregunta no encontrada',
        question_id: '',
        new_status: false,
      });

      await component.disableQuestion('q1');

      expect(toastMock.error).toHaveBeenCalledWith('No se pudo desactivar la pregunta', 'Pregunta no encontrada');
      expect(toastMock.success).not.toHaveBeenCalled();
    });

    it('ignores a second disable while one is in progress', async () => {
      const component = await loaded(['q1', 'q2']);
      let release!: (v: unknown) => void;
      serviceMock.updateQuestionStatus.mockReturnValue(new Promise((r) => (release = r)));

      const first = component.disableQuestion('q1');
      await component.disableQuestion('q2');
      expect(serviceMock.updateQuestionStatus).toHaveBeenCalledTimes(1);

      release({ is_success: true, message: 'ok', question_id: 'q1', new_status: false });
      await first;
    });
  });
});
