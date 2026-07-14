import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { QuestionBankComponent } from './question-bank.component';
import { AssessmentsService } from '../../../core/assessments/assessments.service';

describe('QuestionBankComponent', () => {
  let serviceMock: {
    getAllQuestions: ReturnType<typeof vi.fn>;
    getQuestionsByLevel: ReturnType<typeof vi.fn>;
    getQuestionsByCategory: ReturnType<typeof vi.fn>;
    getQuestionById: ReturnType<typeof vi.fn>;
    getCategories: ReturnType<typeof vi.fn>;
  };

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
      providers: [QuestionBankComponent, { provide: AssessmentsService, useValue: serviceMock }],
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
    };
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
    serviceMock.getAllQuestions.mockRejectedValue(new Error('No tenés permisos'));
    const component = createComponent();
    await Promise.resolve();
    await Promise.resolve();

    expect(component.rows()).toEqual([]);
    expect(component.listError()).toBe('No tenés permisos');
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
});
