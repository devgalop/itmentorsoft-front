import { TestBed } from '@angular/core/testing';
import { AssessmentHistoryComponent, HISTORY_PAGE_SIZE, relativeDate } from './assessment-history.component';
import { AssessmentSummary } from '../../../core/assessments/student-assessment.types';

function item(n: number, score: number, classification: string | null, feedback: string | null = null): AssessmentSummary {
  return {
    assessment_id: 'a' + n,
    score: score * 5,
    date_taken: `2026-10-${String(n).padStart(2, '0')}T10:00:00`,
    classification,
    feedback,
  };
}

describe('AssessmentHistoryComponent', () => {
  function create(items: AssessmentSummary[], inputs: Record<string, unknown> = {}) {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ imports: [AssessmentHistoryComponent] });
    const fixture = TestBed.createComponent(AssessmentHistoryComponent);
    fixture.componentRef.setInput('items', items);
    for (const [k, v] of Object.entries(inputs)) fixture.componentRef.setInput(k, v);
    fixture.detectChanges();
    return { fixture, c: fixture.componentInstance, el: fixture.nativeElement as HTMLElement };
  }

  const data = [item(1, 0.4, 'básico'), item(5, 0.9, 'intermedio', 'Muy bien'), item(3, 0.6, 'básico')];

  describe('summary', () => {
    it('computes total, average, best and the latest evaluation with its change', () => {
      const { c } = create(data);
      const s = c.stats()!;
      expect(s.total).toBe(3);
      expect(s.average).toBe(3.2);
      expect(s.best).toBe(4.5);
      expect(s.last.grade).toBe(4.5);
      expect(s.last.delta).toBe(1.5); // 4.5 contra 3 (la del día 3)
    });

    it('has no summary without evaluations', () => {
      const { c } = create([]);
      expect(c.stats()).toBeNull();
    });

    it('draws the evolution only with two or more evaluations', () => {
      expect(create(data).el.querySelector('.hst__spark polyline')).not.toBeNull();
      expect(create([data[0]!]).el.querySelector('.hst__spark')).toBeNull();
    });

    it('shows the four stat cards', () => {
      const { el } = create(data);
      expect(el.querySelectorAll('.hst__stat')).toHaveLength(4);
      expect(el.textContent).toContain('Mejor resultado');
    });
  });

  describe('list', () => {
    it('lists the most recent first, with level, relative date, change and feedback', () => {
      const { el } = create(data);
      const rows = Array.from(el.querySelectorAll('.hst__row'));
      expect(rows).toHaveLength(3);
      expect(rows[0]!.textContent).toContain('4.5');
      expect(rows[0]!.textContent).toContain('Intermedio');
      expect(rows[0]!.textContent).toContain('+1.5');
      expect(rows[0]!.textContent).toContain('Muy bien');
      expect(rows[2]!.textContent).toContain('2.0');
    });

    it('marks only the best result, and only when there are several evaluations', () => {
      expect(create(data).el.querySelectorAll('.hst__best')).toHaveLength(1);
      expect(create([data[0]!]).el.querySelector('.hst__best')).toBeNull();
    });

    it('shows "Sin clasificar" when the evaluation has no level yet', () => {
      const { el } = create([item(2, 0.5, null)]);
      expect(el.querySelector('.hst__level')?.textContent).toContain('Sin clasificar');
    });

    it('shows a drop with its own sign', () => {
      const { el } = create([item(1, 0.9, 'básico'), item(2, 0.5, 'básico')]);
      expect(el.querySelector('.hst__row')?.textContent).toContain('−2.0');
    });

    it('ignores evaluations with an invalid date', () => {
      const { c } = create([{ ...item(1, 0.5, 'básico'), date_taken: 'no es fecha' }, item(2, 0.7, 'básico')]);
      expect(c.stats()?.total).toBe(1);
    });

    it('emits the id when a row is opened, unless it is busy', () => {
      const { c, el, fixture } = create(data);
      const opened: string[] = [];
      c.openResult.subscribe((id) => opened.push(id));
      (el.querySelector('.hst__row') as HTMLButtonElement).click();
      expect(opened).toEqual(['a5']);
      fixture.componentRef.setInput('busy', true);
      fixture.detectChanges();
      (el.querySelector('.hst__row') as HTMLButtonElement).click();
      expect(opened).toEqual(['a5']);
    });
  });

  describe('sorting and filtering', () => {
    it('sorts by best and worst score', () => {
      const { c, el, fixture } = create(data);
      c.setSort('worst');
      fixture.detectChanges();
      expect(el.querySelector('.hst__row')?.textContent).toContain('2.0');
      c.setSort('best');
      fixture.detectChanges();
      expect(el.querySelector('.hst__row')?.textContent).toContain('4.5');
      c.setSort('algo raro');
      expect(c.sort()).toBe('recent');
    });

    it('offers a filter chip for each level that appears, in level order', () => {
      const { c } = create(data);
      expect(c.levels().map((l) => l.name)).toEqual(['Básico', 'Intermedio']);
    });

    it('filters by level, toggles the filter off and says so when nothing matches', () => {
      const { c, el, fixture } = create(data);
      c.setLevel(1);
      fixture.detectChanges();
      expect(el.querySelectorAll('.hst__row')).toHaveLength(2);
      c.setLevel(1);
      fixture.detectChanges();
      expect(el.querySelectorAll('.hst__row')).toHaveLength(3);
      c.setLevel(3);
      fixture.detectChanges();
      expect(el.querySelector('.hst__none')?.textContent).toContain('No hay evaluaciones');
    });

    it('goes back to the first page when the sort or the filter changes', () => {
      const many = Array.from({ length: 10 }, (_, i) => item(i + 1, 0.5, 'básico'));
      const { c } = create(many);
      c.nextPage();
      expect(c.page()).toBe(1);
      c.setSort('best');
      expect(c.page()).toBe(0);
      c.nextPage();
      c.setLevel(1);
      expect(c.page()).toBe(0);
    });
  });

  describe('pagination', () => {
    const many = Array.from({ length: 14 }, (_, i) => item(i + 1, 0.5, 'básico'));

    it('shows a page at a time and moves between them without leaving the limits', () => {
      const { c } = create(many);
      expect(c.totalPages()).toBe(Math.ceil(14 / HISTORY_PAGE_SIZE));
      expect(c.pageRows()).toHaveLength(HISTORY_PAGE_SIZE);
      c.prevPage();
      expect(c.page()).toBe(0);
      c.nextPage();
      c.nextPage();
      c.nextPage();
      expect(c.page()).toBe(2);
      expect(c.pageRows()).toHaveLength(14 - 2 * HISTORY_PAGE_SIZE);
    });

    it('has a single page for few evaluations', () => {
      expect(create(data).c.totalPages()).toBe(1);
    });
  });

  describe('states', () => {
    it('shows the empty state with a call to action that starts a new evaluation', () => {
      const { c, el } = create([]);
      let created = 0;
      c.create.subscribe(() => created++);
      expect(el.textContent).toContain('Todavía no realizaste evaluaciones');
      (el.querySelector('.hst__empty .hst__btn') as HTMLButtonElement).click();
      expect(created).toBe(1);
    });

    it('shows the header button "Nueva evaluación"', () => {
      const { c, el } = create(data);
      let created = 0;
      c.create.subscribe(() => created++);
      (el.querySelector('.hst__head .hst__btn') as HTMLButtonElement).click();
      expect(created).toBe(1);
    });

    it('shows a loading message only while there is nothing to show yet', () => {
      expect(create([], { loading: true }).el.textContent).toContain('Cargando tu historial');
      expect(create(data, { loading: true }).el.textContent).not.toContain('Cargando tu historial');
    });

    it('shows the grading notice only while an evaluation is pending', () => {
      expect(create(data, { pending: true }).el.querySelector('.hst__pending')?.textContent).toContain('calificando');
      expect(create(data).el.querySelector('.hst__pending')).toBeNull();
    });
  });

  describe('evaluación en curso', () => {
    const draft = { topic: 'POO', answered: 1, total: 3, relative: 'hoy' };

    it('offers to resume or discard an evaluation left unfinished', () => {
      const { c, el } = create(data, { draft });
      let resumed = 0;
      let discarded = 0;
      c.resumeDraft.subscribe(() => resumed++);
      c.discardDraft.subscribe(() => discarded++);
      expect(el.querySelector('.hst__draft')?.textContent).toContain('Tienes una evaluación en curso');
      expect(el.querySelector('.hst__draft')?.textContent).toContain('POO · 1 de 3 respondidas');
      (el.querySelector('.hst__draft .hst__btn') as HTMLButtonElement).click();
      (el.querySelector('.hst__draft .hst__link') as HTMLButtonElement).click();
      expect([resumed, discarded]).toEqual([1, 1]);
    });

    it('shows nothing without an evaluation in progress', () => {
      expect(create(data).el.querySelector('.hst__draft')).toBeNull();
    });
  });

  describe('relativeDate', () => {
    const now = new Date(2026, 9, 12, 15, 0, 0);
    it('says today, yesterday and "hace N días" up to a week', () => {
      expect(relativeDate('2026-10-12T01:00:00', now)).toBe('hoy');
      expect(relativeDate('2026-10-11T23:00:00', now)).toBe('ayer');
      expect(relativeDate('2026-10-09T10:00:00', now)).toBe('hace 3 días');
    });

    it('uses the full date after a week and keeps an invalid one as it came', () => {
      expect(relativeDate('2026-09-01T10:00:00', now)).toBe(new Date('2026-09-01T10:00:00').toLocaleDateString());
      expect(relativeDate('no es fecha', now)).toBe('no es fecha');
    });
  });
});
