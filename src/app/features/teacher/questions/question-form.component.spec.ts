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
  difficulty: 'intermedio',
  topic: 'POO',
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
        difficulty: 'básico',
        topic: 'POO',
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

    it('sends difficulty and topic in the payload', async () => {
      serviceMock.registerQuestion.mockResolvedValue({ is_success: true, message: 'ok' });
      fillValid();

      await component.submit();

      const payload = serviceMock.registerQuestion.mock.calls[0]![0];
      expect(payload.difficulty).toBe('básico');
      expect(payload.topic).toBe('POO');
    });

    it('is invalid without a difficulty', () => {
      fillValid();
      component.form.patchValue({ difficulty: '' });
      expect(component.form.valid).toBe(false);
      expect(component.form.get('difficulty')?.hasError('required')).toBe(true);
    });

    it('validates the topic length (2 to 100)', () => {
      fillValid();
      const topic = component.form.get('topic')!;
      topic.setValue('a');
      expect(topic.hasError('minlength')).toBe(true);
      topic.setValue('a'.repeat(101));
      expect(topic.hasError('maxlength')).toBe(true);
      topic.setValue('POO');
      expect(topic.valid).toBe(true);
    });

    it('exposes the difficulty levels accepted by the backend', () => {
      expect(component.difficulties).toEqual(['básico', 'intermedio', 'avanzado']);
    });

    it('shows the backend message when the response is not successful', async () => {
      serviceMock.registerQuestion.mockResolvedValue({ is_success: false, message: 'Pregunta duplicada' });
      fillValid();

      await component.submit();

      expect(toastMock.error).toHaveBeenCalledWith('No se pudo guardar', 'Pregunta duplicada');
      expect(toastMock.success).not.toHaveBeenCalled();
      expect(component.form.get('text')?.value).not.toBe('');
    });

    it('uses a default message when the unsuccessful response has none', async () => {
      serviceMock.registerQuestion.mockResolvedValue({ is_success: false, message: '' });
      fillValid();

      await component.submit();

      expect(toastMock.error).toHaveBeenCalledWith('No se pudo guardar', 'Intentá nuevamente.');
    });

    it('uses a generic message when the service throws something that is not an Error', async () => {
      serviceMock.registerQuestion.mockRejectedValue('boom');
      fillValid();

      await component.submit();

      expect(toastMock.error).toHaveBeenCalledWith('Error al guardar', 'Error inesperado');
    });

    it('clears the submitting flag after a submit', async () => {
      serviceMock.registerQuestion.mockResolvedValue({ is_success: true, message: 'ok' });
      fillValid();

      await component.submit();

      expect(component.isSubmitting()).toBe(false);
    });

    it('marks every field as touched when submitting an invalid form', async () => {
      await component.submit();
      expect(component.form.get('text')?.touched).toBe(true);
      expect(component.form.get('difficulty')?.touched).toBe(true);
    });

    it('is invalid when there are fewer than 2 misconceptions', () => {
      fillValid();
      component.misconceptions.removeAt(0);
      expect(component.form.valid).toBe(false);
    });

    it('adds and removes keywords but never below 1', () => {
      component.addKeyword();
      expect(component.keywords.length).toBe(2);
      component.removeKeyword(1);
      expect(component.keywords.length).toBe(1);
      component.removeKeyword(0);
      expect(component.keywords.length).toBe(1);
    });

    it('adds and removes rubric rows but never below 1', () => {
      component.addRubric();
      expect(component.rubric.length).toBe(2);
      component.removeRubric(1);
      expect(component.rubric.length).toBe(1);
      component.removeRubric(0);
      expect(component.rubric.length).toBe(1);
    });

    describe('fieldError', () => {
      it('returns null without a control', () => {
        expect(component.fieldError(null)).toBeNull();
      });

      it('returns null until the control is touched', () => {
        expect(component.fieldError(component.form.get('text'))).toBeNull();
      });

      it('returns null for a touched control without errors', () => {
        const ctrl = component.form.get('topic')!;
        ctrl.setValue('POO');
        ctrl.markAsTouched();
        expect(component.fieldError(ctrl)).toBeNull();
      });

      it.each([
        ['text', '', 'Requerido'],
        ['text', 'corto', 'Mínimo 20 caracteres'],
        ['text', 'x'.repeat(501), 'Máximo 500 caracteres'],
        ['topic', 'a', 'Mínimo 2 caracteres'],
        ['difficulty', '', 'Requerido'],
      ])('maps %s="%s" to "%s"', (field, value, message) => {
        const ctrl = component.form.get(field)!;
        ctrl.setValue(value);
        ctrl.markAsTouched();
        expect(component.fieldError(ctrl)).toBe(message);
      });

      it('maps the rubric score limits', () => {
        const score = component.rubric.at(0).get('score')!;
        score.setValue(5);
        score.markAsTouched();
        expect(component.fieldError(score)).toBe('Máximo 3');
        score.setValue(-1);
        expect(component.fieldError(score)).toBe('Mínimo 0');
      });

      it('returns a generic message for an unknown error', () => {
        const ctrl = component.form.get('topic')!;
        ctrl.setErrors({ custom: true });
        ctrl.markAsTouched();
        expect(component.fieldError(ctrl)).toBe('Inválido');
      });
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

    it('filters out rubric rows with empty criteria on preload', async () => {
      const detailWithBlank = {
        ...validDetail,
        rubric: [
          { score: 0, explanation: '' },
          { score: 0, explanation: '   ' },
          { score: 2, explanation: 'criterio de rubrica valido' },
        ],
      };
      const { component } = createEdit('q-2', detailWithBlank);
      await Promise.resolve();
      await Promise.resolve();

      // Solo queda el criterio con contenido; no se cargan los vacíos.
      expect(component.rubric.length).toBe(1);
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

    it('preloads difficulty and topic', async () => {
      const { component } = createEdit('q-1', validDetail);
      await Promise.resolve();
      await Promise.resolve();

      expect(component.form.get('difficulty')?.value).toBe('intermedio');
      expect(component.form.get('topic')?.value).toBe('POO');
    });

    it('sends the preloaded difficulty and topic when updating', async () => {
      const { component, serviceMock } = createEdit('q-1', validDetail);
      serviceMock.updateQuestion.mockResolvedValue({ is_success: true, message: 'ok' });
      await Promise.resolve();
      await Promise.resolve();

      await component.submit();

      const payload = serviceMock.updateQuestion.mock.calls[0]![1];
      expect(payload.difficulty).toBe('intermedio');
      expect(payload.topic).toBe('POO');
    });

    it('does not reset the form after a successful update', async () => {
      const { component, serviceMock } = createEdit('q-1', validDetail);
      serviceMock.updateQuestion.mockResolvedValue({ is_success: true, message: 'ok' });
      await Promise.resolve();
      await Promise.resolve();

      await component.submit();

      expect(component.form.get('text')?.value).toBe(validDetail.text);
    });

    it('shows the backend message when the update is rejected', async () => {
      const { component, serviceMock } = createEdit('q-1', validDetail);
      serviceMock.updateQuestion.mockResolvedValue({ is_success: false, message: 'No permitido' });
      await Promise.resolve();
      await Promise.resolve();

      await component.submit();

      expect(toastMock.error).toHaveBeenCalledWith('No se pudo guardar', 'No permitido');
    });

    it('pads the misconceptions to 2 when the detail has fewer', async () => {
      const { component } = createEdit('q-3', {
        ...validDetail,
        common_misconception: ['m'.repeat(25)],
      });
      await Promise.resolve();
      await Promise.resolve();

      expect(component.misconceptions.length).toBe(2);
    });

    it('keeps at least one keyword and one rubric row when the detail has none valid', async () => {
      const { component } = createEdit('q-4', {
        ...validDetail,
        semantic_keywords: ['', '  '],
        rubric: [{ score: 0, explanation: '' }],
      });
      await Promise.resolve();
      await Promise.resolve();

      expect(component.keywords.length).toBe(1);
      expect(component.rubric.length).toBe(1);
    });

    it('shows the error message when loading the question fails', async () => {
      TestBed.resetTestingModule();
      const failing = {
        registerQuestion: vi.fn(),
        updateQuestion: vi.fn(),
        getQuestionById: vi.fn().mockRejectedValue(new Error('Sin conexión al servidor')),
      };
      TestBed.configureTestingModule({
        imports: [QuestionFormComponent],
        providers: [
          provideRouter([]),
          { provide: AssessmentsService, useValue: failing },
          { provide: ToastService, useValue: toastMock },
          { provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap({ id: 'q-9' }) } } },
        ],
      });
      const component = TestBed.createComponent(QuestionFormComponent).componentInstance;
      await Promise.resolve();
      await Promise.resolve();

      expect(component.loadError()).toBe('Sin conexión al servidor');
      expect(component.isLoading()).toBe(false);
    });

    it('uses a generic message when loading throws something that is not an Error', async () => {
      TestBed.resetTestingModule();
      const failing = {
        registerQuestion: vi.fn(),
        updateQuestion: vi.fn(),
        getQuestionById: vi.fn().mockRejectedValue('boom'),
      };
      TestBed.configureTestingModule({
        imports: [QuestionFormComponent],
        providers: [
          provideRouter([]),
          { provide: AssessmentsService, useValue: failing },
          { provide: ToastService, useValue: toastMock },
          { provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap({ id: 'q-9' }) } } },
        ],
      });
      const component = TestBed.createComponent(QuestionFormComponent).componentInstance;
      await Promise.resolve();
      await Promise.resolve();

      expect(component.loadError()).toBe('Error al cargar la pregunta.');
    });
  });
});
