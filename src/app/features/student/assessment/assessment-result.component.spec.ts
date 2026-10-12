import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { AssessmentResultComponent } from './assessment-result.component';
import { StudentAssessmentResult } from '../../../core/assessments/student-assessment.types';

describe('AssessmentResultComponent', () => {
  const base: StudentAssessmentResult = {
    assessment_id: 'a1',
    user_id: 'u1',
    avg_score: 0.6,
    classification: 'intermedio',
    feedback: 'Buen avance.',
    answer_scores: [
      { question_id: 'q1', question_text: 'Pregunta uno', answer: 'resp 1', score: 0.9, feedback: 'Muy bien', key_concepts: ['clases'], misconceptions: [] },
      { question_id: 'q2', question_text: 'Pregunta dos', answer: 'resp 2', score: 0.3, feedback: 'Falta detalle', key_concepts: null, misconceptions: ['herencia'] },
      { question_id: 'q3', question_text: 'Pregunta tres', answer: 'no sé', score: 0, feedback: 'Vacía' },
    ],
  };

  function create(result: StudentAssessmentResult = base) {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ imports: [AssessmentResultComponent], providers: [provideRouter([])] });
    const fixture = TestBed.createComponent(AssessmentResultComponent);
    fixture.componentRef.setInput('result', result);
    fixture.detectChanges();
    return { fixture, component: fixture.componentInstance, el: fixture.nativeElement as HTMLElement };
  }

  it('shows the average as a percentage and a ring proportional to it', () => {
    const { component, el } = create();
    expect(component.score()).toBe(60);
    expect(el.querySelector('.res__ring-value')?.textContent).toContain('60%');
    const [filled, total] = component.ringDash().split(' ').map(Number);
    expect(filled! / total!).toBeCloseTo(0.6, 5);
  });

  it('shows the level, the feedback and the medal of the evaluation', () => {
    const { el } = create();
    expect(el.querySelector('.res__classif')?.textContent).toContain('intermedio');
    expect(el.querySelector('.res__feedback')?.textContent).toContain('Buen avance.');
    expect(el.querySelector('.dash__medal')?.textContent).toContain('Intermedio');
    expect(el.querySelector('.dash__medal')?.textContent).toContain('Nivel de esta evaluación');
  });

  it('has no medal when the classification is not one of the four levels', () => {
    const { el } = create({ ...base, classification: '' });
    expect(el.querySelector('.dash__medal')).toBeNull();
    expect(el.querySelector('.res__classif')).toBeNull();
  });

  it('summarizes the questions: total, best answer and how many need reinforcement', () => {
    const { component, el } = create();
    expect(component.summary()).toEqual({ total: 3, best: 90, toReinforce: 2 });
    expect(el.querySelectorAll('.res__stat')).toHaveLength(3);
  });

  it('handles an evaluation without answers', () => {
    const { component } = create({ ...base, answer_scores: [] });
    expect(component.summary()).toEqual({ total: 0, best: null, toReinforce: 0 });
  });

  it('lists every question with number, score, answer and feedback', () => {
    const { el } = create();
    const cards = Array.from(el.querySelectorAll('.res__answer'));
    expect(cards).toHaveLength(3);
    expect(cards[0]!.textContent).toContain('Pregunta uno');
    expect(cards[0]!.querySelector('.res__answer-num')?.textContent?.trim()).toBe('1');
    expect(cards[0]!.querySelector('.res__answer-score')?.textContent).toContain('90%');
    expect(cards[1]!.textContent).toContain('resp 2');
    expect(cards[1]!.textContent).toContain('Falta detalle');
  });

  it('shows the key concepts and the misconceptions only when there are some', () => {
    const { el } = create();
    const cards = Array.from(el.querySelectorAll('.res__answer'));
    expect(cards[0]!.querySelector('.res__chip--ok')?.textContent).toContain('clases');
    expect(cards[0]!.querySelector('.res__chip--warn')).toBeNull();
    expect(cards[1]!.querySelector('.res__chip--ok')).toBeNull();
    expect(cards[1]!.querySelector('.res__chip--warn')?.textContent).toContain('herencia');
    expect(cards[2]!.querySelector('.res__chips')).toBeNull();
  });

  it('emits back and again from the buttons', () => {
    const { component, el } = create();
    let back = 0;
    let again = 0;
    component.back.subscribe(() => back++);
    component.again.subscribe(() => again++);
    (el.querySelector('.res__back') as HTMLButtonElement).click();
    (el.querySelector('.res__btn--ghost') as HTMLButtonElement).click();
    (el.querySelector('.res__btn--solid') as HTMLButtonElement).click();
    expect(back).toBe(2);
    expect(again).toBe(1);
  });

  it('links to the resources explorer', () => {
    const { el } = create();
    expect(el.querySelector('a[href="/student/explore"]')).not.toBeNull();
  });
});
