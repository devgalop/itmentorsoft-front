import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { QuestionBankComponent } from './question-bank.component';
import { AssessmentsService } from '../../../core/assessments/assessments.service';

describe('QuestionBankComponent', () => {
  let component: QuestionBankComponent;
  let serviceMock: {
    getQuestionsByLevel: ReturnType<typeof vi.fn>;
    getQuestionsByCategory: ReturnType<typeof vi.fn>;
    getQuestionById: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    serviceMock = {
      getQuestionsByLevel: vi.fn(),
      getQuestionsByCategory: vi.fn(),
      getQuestionById: vi.fn(),
    };

    TestBed.configureTestingModule({
      providers: [
        QuestionBankComponent,
        { provide: AssessmentsService, useValue: serviceMock },
      ],
    });

    component = TestBed.inject(QuestionBankComponent);
  });

  it('creates with level mode and the first difficulty selected', () => {
    expect(component).toBeTruthy();
    expect(component.mode()).toBe('level');
    expect(component.selectedValue()).toBe('básico');
  });

  it('switching to category mode resets the selected value to the first category', () => {
    component.setMode('category');
    expect(component.mode()).toBe('category');
    expect(component.selectedValue()).toBe('APIs y sistemas distribuidos');
  });

  describe('search', () => {
    it('calls getQuestionsByLevel in level mode and stores the list', async () => {
      serviceMock.getQuestionsByLevel.mockResolvedValue([
        { question_id: 'q1', text_to_evaluate: 'texto' },
      ]);

      await component.search();

      expect(serviceMock.getQuestionsByLevel).toHaveBeenCalledWith('básico');
      expect(component.questions()).toHaveLength(1);
      expect(component.hasSearched()).toBe(true);
    });

    it('calls getQuestionsByCategory in category mode', async () => {
      serviceMock.getQuestionsByCategory.mockResolvedValue([]);
      component.setMode('category');
      component.onValueChange('Fundamentos y paradigmas');

      await component.search();

      expect(serviceMock.getQuestionsByCategory).toHaveBeenCalledWith('Fundamentos y paradigmas');
    });

    it('captures the error message and clears the list on failure', async () => {
      serviceMock.getQuestionsByLevel.mockRejectedValue(new Error('No tenés permisos para ver este contenido'));

      await component.search();

      expect(component.questions()).toEqual([]);
      expect(component.listError()).toBe('No tenés permisos para ver este contenido');
    });
  });

  describe('selectQuestion', () => {
    it('loads and stores the detail for the selected question', async () => {
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

      await component.selectQuestion('q1');

      expect(serviceMock.getQuestionById).toHaveBeenCalledWith('q1');
      expect(component.selectedId()).toBe('q1');
      expect(component.detail()).toEqual(detail);
    });

    it('sets a detail error when the question is not found', async () => {
      serviceMock.getQuestionById.mockResolvedValue(null);

      await component.selectQuestion('missing');

      expect(component.detail()).toBeNull();
      expect(component.detailError()).toBe('No se encontró el detalle de la pregunta');
    });

    it('does not refetch when the same question is already selected', async () => {
      serviceMock.getQuestionById.mockResolvedValue(null);
      await component.selectQuestion('q1');
      serviceMock.getQuestionById.mockClear();

      await component.selectQuestion('q1');
      expect(serviceMock.getQuestionById).not.toHaveBeenCalled();
    });
  });
});
