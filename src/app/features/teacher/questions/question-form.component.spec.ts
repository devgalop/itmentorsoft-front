import { ComponentFixture, TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { QuestionFormComponent } from './question-form.component';
import { AssessmentsService } from '../../../core/assessments/assessments.service';

describe('QuestionFormComponent', () => {
  let component: QuestionFormComponent;
  let fixture: ComponentFixture<QuestionFormComponent>;
  let serviceMock: { registerQuestion: ReturnType<typeof vi.fn> };

  beforeEach(async () => {
    serviceMock = { registerQuestion: vi.fn() };

    await TestBed.configureTestingModule({
      imports: [QuestionFormComponent],
      providers: [{ provide: AssessmentsService, useValue: serviceMock }],
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

  it('adds and removes keywords but never below 1', () => {
    component.addKeyword();
    expect(component.keywords.length).toBe(2);
    component.removeKeyword(1);
    expect(component.keywords.length).toBe(1);
    component.removeKeyword(0);
    expect(component.keywords.length).toBe(1);
  });

  it('does not submit when the form is invalid', async () => {
    await component.submit();
    expect(serviceMock.registerQuestion).not.toHaveBeenCalled();
  });

  it('submits the payload and shows success, then resets', async () => {
    serviceMock.registerQuestion.mockResolvedValue({
      is_success: true,
      message: 'Pregunta creada',
      question_id: 'q-1',
    });
    fillValid();

    await component.submit();

    expect(serviceMock.registerQuestion).toHaveBeenCalledTimes(1);
    const payload = serviceMock.registerQuestion.mock.calls[0][0];
    expect(payload.text.length).toBe(25);
    expect(payload.common_misconception).toHaveLength(2);
    expect(payload.rubric[0]).toEqual({ score: 3, criteria: 'criterio valido aqui' });
    expect(component.submitSuccess()).toBe('Pregunta creada');
    // reset deja la estructura inicial
    expect(component.misconceptions.length).toBe(2);
    expect(component.form.get('text')?.value).toBe('');
  });

  it('shows an error when the backend responds is_success false', async () => {
    serviceMock.registerQuestion.mockResolvedValue({ is_success: false, message: 'Rechazada' });
    fillValid();

    await component.submit();

    expect(component.submitError()).toBe('Rechazada');
    expect(component.submitSuccess()).toBeNull();
  });

  it('shows an error when the service throws', async () => {
    serviceMock.registerQuestion.mockRejectedValue(new Error('Sin conexión al servidor'));
    fillValid();

    await component.submit();

    expect(component.submitError()).toBe('Sin conexión al servidor');
  });
});
