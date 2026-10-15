import { TestBed } from '@angular/core/testing';
import { DRAFT_TTL_MS, EvaluationDraft, EvaluationDraftStore } from './evaluation-draft.store';

describe('EvaluationDraftStore', () => {
  let store: EvaluationDraftStore;

  const draft: EvaluationDraft = {
    userId: 'u1',
    assessmentId: 'a1',
    questions: [{ question_id: 'q1', topic: 'POO', text_to_evaluate: '¿Qué es una clase?' }],
    answers: { q1: 'es un molde' },
    times: { q1: 12 },
    currentIndex: 0,
    savedAt: 1_000_000,
  };

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({});
    store = TestBed.inject(EvaluationDraftStore);
  });

  afterEach(() => localStorage.clear());

  it('saves and returns the evaluation in progress of a student', () => {
    store.save(draft);
    expect(store.get('u1', 1_000_500)).toEqual(draft);
  });

  it('keeps one evaluation per student', () => {
    store.save(draft);
    expect(store.get('u2', 1_000_500)).toBeNull();
  });

  it('forgets it when cleared', () => {
    store.save(draft);
    store.clear('u1');
    expect(store.get('u1', 1_000_500)).toBeNull();
  });

  it('discards an evaluation abandoned for more than a day', () => {
    store.save(draft);
    expect(store.get('u1', draft.savedAt + DRAFT_TTL_MS + 1)).toBeNull();
    expect(localStorage.getItem('itm.evaluation-draft.u1')).toBeNull();
  });

  it('ignores stored data that is not a valid evaluation', () => {
    localStorage.setItem('itm.evaluation-draft.u1', '{no es json');
    expect(store.get('u1')).toBeNull();
    for (const bad of [{}, { ...draft, questions: [] }, { ...draft, assessmentId: '' }, { ...draft, userId: 'otro' }, null]) {
      localStorage.setItem('itm.evaluation-draft.u1', JSON.stringify(bad));
      expect(store.get('u1', 1_000_500)).toBeNull();
    }
  });
});
