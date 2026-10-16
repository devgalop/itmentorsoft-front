import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { AssessmentResultComponent } from './assessment-result.component';
import { StudentAssessmentResult } from '../../../core/assessments/student-assessment.types';

describe('AssessmentResultComponent', () => {
  const base: StudentAssessmentResult = {
    assessment_id: 'a1',
    user_id: 'u1',
    avg_score: 3,
    classification: 'intermedio',
    feedback: 'Buen avance.',
    answer_scores: [
      { question_id: 'q1', question_text: 'Pregunta uno', answer: 'resp 1', score: 4.5, feedback: 'Muy bien', key_concepts: ['clases'], misconceptions: [] },
      { question_id: 'q2', question_text: 'Pregunta dos', answer: 'resp 2', score: 1.5, feedback: 'Falta detalle', key_concepts: null, misconceptions: ['herencia'] },
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
    expect(el.querySelector('.res__ring-value')?.textContent).toContain('3.0');
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
    expect(component.summary()).toEqual({ total: 3, best: 4.5, toReinforce: 2 });
    expect(el.querySelectorAll('.res__stat')).toHaveLength(3);
  });

  it('handles an evaluation without answers', () => {
    const { component } = create({ ...base, answer_scores: [] });
    expect(component.summary()).toEqual({ total: 0, best: null, toReinforce: 0 });
  });

  it('lists every question with number, score, answer and feedback once opened', () => {
    const { component, fixture, el } = create();
    component.toggleAll();
    fixture.detectChanges();
    const cards = Array.from(el.querySelectorAll('.res__answer'));
    expect(cards).toHaveLength(3);
    expect(cards[0]!.textContent).toContain('Pregunta uno');
    expect(cards[0]!.querySelector('.res__answer-num')?.textContent?.trim()).toBe('1');
    expect(cards[0]!.querySelector('.res__answer-score')?.textContent).toContain('4.5');
    expect(cards[1]!.textContent).toContain('resp 2');
    expect(cards[1]!.textContent).toContain('Falta detalle');
  });

  it('shows the key concepts and the misconceptions only when there are some', () => {
    const { component, fixture, el } = create();
    component.toggleAll();
    fixture.detectChanges();
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

  describe('collapsible questions', () => {
    it('starts with every question folded: only the number, question and score show', () => {
      const { component, el } = create();
      expect(component.openNumbers().size).toBe(0);
      expect(el.querySelectorAll('.res__body')).toHaveLength(0);
      const first = el.querySelector('.res__answer')!;
      expect(first.textContent).toContain('Pregunta uno');
      expect(first.textContent).toContain('4.5');
      expect(first.textContent).not.toContain('resp 1');
      expect(first.querySelector('.res__answer-head')?.getAttribute('aria-expanded')).toBe('false');
    });

    it('opens and closes a question when its header is clicked', () => {
      const { fixture, el } = create();
      const head = () => el.querySelector('.res__answer-head') as HTMLButtonElement;
      head().click();
      fixture.detectChanges();
      expect(el.querySelector('.res__answer')!.textContent).toContain('resp 1');
      expect(head().getAttribute('aria-expanded')).toBe('true');
      expect(el.querySelectorAll('.res__body')).toHaveLength(1);
      head().click();
      fixture.detectChanges();
      expect(el.querySelectorAll('.res__body')).toHaveLength(0);
    });

    it('opens one question without closing the others', () => {
      const { component } = create();
      component.toggle(1);
      component.toggle(3);
      expect([...component.openNumbers()].sort()).toEqual([1, 3]);
      expect(component.isOpen(2)).toBe(false);
    });

    it('"Desplegar todas" opens all of them and then folds them again', () => {
      const { component, fixture, el } = create();
      const btn = () => el.querySelector('.res__toggle-all') as HTMLButtonElement;
      expect(btn().textContent).toContain('Desplegar todas');
      btn().click();
      fixture.detectChanges();
      expect(el.querySelectorAll('.res__body')).toHaveLength(3);
      expect(component.allOpen()).toBe(true);
      expect(btn().textContent).toContain('Plegar todas');
      btn().click();
      fixture.detectChanges();
      expect(el.querySelectorAll('.res__body')).toHaveLength(0);
    });

    it('flags in the folded row the questions that have something to reinforce', () => {
      const { el } = create();
      const flags = el.querySelectorAll('.res__flag');
      expect(flags).toHaveLength(1);
      expect(flags[0]!.textContent).toContain('1 por reforzar');
    });

    it('has no toggle button without questions', () => {
      const { el } = create({ ...base, answer_scores: [] });
      expect(el.querySelector('.res__toggle-all')).toBeNull();
    });
  });
});
