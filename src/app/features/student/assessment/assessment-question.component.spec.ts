import { TestBed } from '@angular/core/testing';
import { AssessmentQuestionComponent, QuestionItem } from './assessment-question.component';

describe('AssessmentQuestionComponent', () => {
  const question = { question_id: 'q2', topic: 'POO', text_to_evaluate: '¿Qué es la herencia?' };
  const items: QuestionItem[] = [
    { number: 1, text: 'Primera pregunta', current: false, answered: true },
    { number: 2, text: '¿Qué es la herencia?', current: true, answered: false },
    { number: 3, text: 'Tercera pregunta', current: false, answered: false },
  ];

  function create(inputs: Record<string, unknown> = {}) {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ imports: [AssessmentQuestionComponent] });
    const fixture = TestBed.createComponent(AssessmentQuestionComponent);
    fixture.componentRef.setInput('question', question);
    fixture.componentRef.setInput('index', 1);
    fixture.componentRef.setInput('items', items);
    for (const [k, v] of Object.entries(inputs)) fixture.componentRef.setInput(k, v);
    fixture.detectChanges();
    return { fixture, c: fixture.componentInstance, el: fixture.nativeElement as HTMLElement };
  }

  it('shows the topic, the position and the question', () => {
    const { el } = create();
    expect(el.querySelector('.aq__topic')?.textContent).toContain('POO');
    expect(el.querySelector('.aq__count')?.textContent).toContain('Pregunta 2 de 3');
    expect(el.querySelector('.aq__qtext')?.textContent).toContain('¿Qué es la herencia?');
  });

  it('fills the progress bar with the answered questions', () => {
    const { c, el } = create();
    expect(c.answeredCount()).toBe(1);
    expect(c.progressPct()).toBe(33);
    expect(el.querySelector('.aq__progress')?.getAttribute('aria-valuenow')).toBe('1');
    expect(el.querySelector('.aq__progress')?.getAttribute('aria-valuemax')).toBe('3');
  });

  it('shows how many questions are missing, or that all are answered', () => {
    expect(create().el.querySelector('.aq__status')?.textContent).toContain('Faltan 2 por responder');
    const all = items.map((i) => ({ ...i, answered: true }));
    expect(create({ items: all }).el.querySelector('.aq__status')?.textContent).toContain('Todas respondidas');
  });

  describe('answer box', () => {
    it('shows the draft and a counter that turns into a warning at the limit', () => {
      const { el } = create({ draft: 'hola', maxLength: 10 });
      expect(el.querySelector('.aq__meter-text')?.textContent).toContain('4 / 10');
      expect(el.querySelector('.aq__meter-text--limit')).toBeNull();
      const full = create({ draft: '0123456789', maxLength: 10 });
      expect(full.c.atLimit()).toBe(true);
      expect(full.c.usedPct()).toBe(100);
      expect(full.el.querySelector('.aq__meter-text--limit')).not.toBeNull();
    });

    it('emits the text when the student types', () => {
      const { c, el } = create();
      const values: string[] = [];
      c.answerChange.subscribe((v) => values.push(v));
      const area = el.querySelector('textarea') as HTMLTextAreaElement;
      area.value = 'mi respuesta';
      area.dispatchEvent(new Event('input'));
      expect(values).toEqual(['mi respuesta']);
    });

    it('reports the clipboard actions so the caller can block them', () => {
      const { c, el } = create();
      const actions: string[] = [];
      c.clipboard.subscribe((a) => actions.push(a.action));
      const area = el.querySelector('textarea') as HTMLTextAreaElement;
      for (const type of ['paste', 'copy', 'cut', 'drop']) area.dispatchEvent(new Event(type));
      expect(actions).toEqual(['pegar', 'copiar', 'cortar', 'arrastrar']);
    });

    it('reports the context menu', () => {
      const { c, el } = create();
      let menus = 0;
      c.menu.subscribe(() => menus++);
      (el.querySelector('textarea') as HTMLTextAreaElement).dispatchEvent(new Event('contextmenu'));
      expect(menus).toBe(1);
    });

    it('shows the integrity note only when copy and paste are blocked', () => {
      expect(create().el.querySelector('.aq__note')).toBeNull();
      expect(create({ clipboardBlocked: true }).el.querySelector('.aq__note')).not.toBeNull();
    });
  });

  describe('navigation', () => {
    it('emits prev and next, and disables "Anterior" on the first question', () => {
      const { c, el } = create();
      let prev = 0;
      let next = 0;
      c.prev.subscribe(() => prev++);
      c.next.subscribe(() => next++);
      (el.querySelector('.aq__btn--ghost') as HTMLButtonElement).click();
      (el.querySelector('.aq__btn--solid') as HTMLButtonElement).click();
      expect([prev, next]).toEqual([1, 1]);
      expect(create({ index: 0 }).el.querySelector('.aq__btn--ghost')?.hasAttribute('disabled')).toBe(true);
    });

    it('offers "Enviar evaluación" on the last question and locks it while busy', () => {
      const { c, el, fixture } = create({ isLast: true });
      let sent = 0;
      c.submitted.subscribe(() => sent++);
      const btn = () => el.querySelector('.aq__btn--solid') as HTMLButtonElement;
      expect(btn().textContent).toContain('Enviar evaluación');
      btn().click();
      expect(sent).toBe(1);
      fixture.componentRef.setInput('busy', true);
      fixture.detectChanges();
      expect(btn().textContent).toContain('Enviando…');
      expect(btn().disabled).toBe(true);
    });

    it('lists the questions, marks the current and the answered ones, and jumps on click', () => {
      const { c, el } = create();
      const jumps: number[] = [];
      c.jump.subscribe((i) => jumps.push(i));
      const rows = Array.from(el.querySelectorAll('.aq__item')) as HTMLButtonElement[];
      expect(rows).toHaveLength(3);
      expect(rows[0]!.querySelector('.aq__item-num--done')).not.toBeNull();
      expect(rows[1]!.classList.contains('aq__item--current')).toBe(true);
      rows[2]!.click();
      expect(jumps).toEqual([2]);
    });
  });

  describe('keyboard shortcut', () => {
    function press(el: HTMLElement, init: KeyboardEventInit) {
      const event = new KeyboardEvent('keydown', { cancelable: true, ...init });
      el.querySelector('textarea')!.dispatchEvent(event);
      return event;
    }

    it('Ctrl + Enter goes to the next question', () => {
      const { c, el } = create();
      let next = 0;
      c.next.subscribe(() => next++);
      const event = press(el, { key: 'Enter', ctrlKey: true });
      expect(next).toBe(1);
      expect(event.defaultPrevented).toBe(true);
    });

    it('Cmd + Enter submits on the last question, but not while busy', () => {
      const { c, el, fixture } = create({ isLast: true });
      let sent = 0;
      c.submitted.subscribe(() => sent++);
      press(el, { key: 'Enter', metaKey: true });
      expect(sent).toBe(1);
      fixture.componentRef.setInput('busy', true);
      fixture.detectChanges();
      press(el, { key: 'Enter', metaKey: true });
      expect(sent).toBe(1);
    });

    it('a plain Enter keeps writing a new line', () => {
      const { c, el } = create();
      let next = 0;
      c.next.subscribe(() => next++);
      const event = press(el, { key: 'Enter' });
      expect(next).toBe(0);
      expect(event.defaultPrevented).toBe(false);
    });
  });
});
