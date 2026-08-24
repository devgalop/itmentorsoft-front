import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { vi } from 'vitest';
import { QuestionFormComponent } from './question-form.component';
import { AssessmentsService } from '../../../core/assessments/assessments.service';
import { ToastService } from '../../../shared/ui/toast/toast.service';

const validDetail = {
  question_id: 'q-1',
  text: 't'.repeat(25),
  concept: 'concepto valido',
  definition: 'd'.repeat(25),
  simple_explanation: 's'.repeat(25),
  correct_sample: 'c'.repeat(25),
  wrong_sample: 'w'.repeat(25),
  common_misconception: ['m'.repeat(25), 'n'.repeat(25), 'o'.repeat(25)],
  rubric: [{ score: 2, explanation: 'criterio de rubrica valido' }],
  semantic_keywords: ['alpha', 'beta'],
  status: 'published',
};

const toastMock = { success: vi.fn(), error: vi.fn(), info: vi.fn(), warning: vi.fn() };
afterEach(() => { toastMock.success.mockClear(); toastMock.error.mockClear(); });

describe('QuestionFormComponent', () => {
  describe('modo creación', () => {
    let component: QuestionFormComponent;
    let fixture: ComponentFixture<QuestionFormComponent>;
    let serviceMock: {
      registerQuestion: ReturnType<typeof vi.fn>;
      updateQuestion: ReturnType<typeof vi.fn>;
      getQuestionById: ReturnType<typeof vi.fn>;
    };

    beforeEach(async () => {
      serviceMock = {
        registerQuestion: vi.fn(),
        updateQuestion: vi.fn(),
        getQuestionById: vi.fn(),
      };

      await TestBed.configureTestingModule({
        imports: [QuestionFormComponent],
        providers: [provideRouter([]), { provide: AssessmentsService, useValue: serviceMock }, { provide: ToastService, useValue: toastMock }],
      }).compileComponents();

      fixture = TestBed.createComponent(QuestionFormComponent);
      component = fixture.componentInstance;
      fixture.detectChanges();
    });

    function fillValid(): void {
      component.form.patchValue({
        text: 'x'.repeat(25),
        concept: 'concepto valido',
        definition: 'y'.repeat(25),
        simple_explanation: 'z'.repeat(25),
        correct_sample: 'a'.repeat(25),
        wrong_sample: 'b'.repeat(25),
      });
      component.misconceptions.at(0).setValue('m'.repeat(25));
      component.misconceptions.at(1).setValue('n'.repeat(25));
      component.keywords.at(0).setValue('kw');
      component.rubric.at(0).patchValue({ score: 3, criteria: 'criterio valido aqui' });
    }

    it('is not in edit mode', () => {
      expect(component.isEditMode()).toBe(false);
    });

    it('starts with 2 misconceptions, 1 keyword and 1 rubric row', () => {
      expect(component.misconceptions.length).toBe(2);
      expect(component.keywords.length).toBe(1);
      expect(component.rubric.length).toBe(1);
    });

    it('is invalid while required fields are empty', () => {
      expect(component.form.valid).toBe(false);
    });

    it('becomes valid once all fields are filled correctly', () => {
      fillValid();
      expect(component.form.valid).toBe(true);
    });

    it('adds and removes misconceptions but never below 2', () => {
      component.addMisconception();
      expect(component.misconceptions.length).toBe(3);
      component.removeMisconception(2);
      expect(component.misconceptions.length).toBe(2);
      component.removeMisconception(0);
      expect(component.misconceptions.length).toBe(2);
    });

    it('does not submit when the form is invalid', async () => {
      await component.submit();
      expect(serviceMock.registerQuestion).not.toHaveBeenCalled();
    });

    it('submits via registerQuestion, shows success and resets', async () => {
      serviceMock.registerQuestion.mockResolvedValue({
        is_success: true,
        message: 'Pregunta creada',
        question_id: 'q-1',
      });
      fillValid();

      await component.submit();

      expect(serviceMock.registerQuestion).toHaveBeenCalledTimes(1);
      expect(serviceMock.updateQuestion).not.toHaveBeenCalled();
      expect(toastMock.success).toHaveBeenCalledWith('Pregunta creada', expect.any(String));
      expect(component.misconceptions.length).toBe(2);
      expect(component.form.get('text')?.value).toBe('');
    });

    it('shows an error when the service throws', async () => {
      serviceMock.registerQuestion.mockRejectedValue(new Error('Sin conexión al servidor'));
      fillValid();

      await component.submit();

      expect(toastMock.error).toHaveBeenCalledWith('Error al guardar', 'Sin conexión al servidor');
    });
  });

  describe('modo edición', () => {
    function createEdit(id: string, detail: unknown) {
      TestBed.resetTestingModule();
      const serviceMock = {
        registerQuestion: vi.fn(),
        updateQuestion: vi.fn(),
        getQuestionById: vi.fn().mockResolvedValue(detail),
      };
      TestBed.configureTestingModule({
        imports: [QuestionFormComponent],
        providers: [
          provideRouter([]),
          { provide: AssessmentsService, useValue: serviceMock },
          { provide: ToastService, useValue: toastMock },
          {
            provide: ActivatedRoute,
            useValue: { snapshot: { paramMap: convertToParamMap({ id }) } },
          },
        ],
      });
      const fixture = TestBed.createComponent(QuestionFormComponent);
      return { component: fixture.componentInstance, serviceMock };
    }

    it('enters edit mode and preloads the question (mapping explanation -> criteria)', async () => {
      const { component, serviceMock } = createEdit('q-1', validDetail);
      await Promise.resolve();
      await Promise.resolve();

      expect(component.isEditMode()).toBe(true);
      expect(serviceMock.getQuestionById).toHaveBeenCalledWith('q-1');
      expect(component.form.get('text')?.value).toBe(validDetail.text);
      expect(component.misconceptions.length).toBe(3);
      expect(component.keywords.length).toBe(2);
      expect(component.rubric.at(0).get('criteria')?.value).toBe('criterio de rubrica valido');
    });

    it('submits via updateQuestion in edit mode', async () => {
      const { component, serviceMock } = createEdit('q-1', validDetail);
      serviceMock.updateQuestion.mockResolvedValue({ is_success: true, message: 'Actualizada' });
      await Promise.resolve();
      await Promise.resolve();

      await component.submit();

      expect(serviceMock.updateQuestion).toHaveBeenCalledTimes(1);
      expect(serviceMock.updateQuestion.mock.calls[0][0]).toBe('q-1');
      expect(serviceMock.registerQuestion).not.toHaveBeenCalled();
      expect(toastMock.success).toHaveBeenCalledWith('Pregunta actualizada', expect.any(String));
    });

    it('shows a load error when the question is not found', async () => {
      const { component } = createEdit('missing', null);
      await Promise.resolve();
      await Promise.resolve();

      expect(component.loadError()).toContain('No se encontró');
    });
  });
});
