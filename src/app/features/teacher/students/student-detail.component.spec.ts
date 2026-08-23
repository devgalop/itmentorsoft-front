import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { vi } from 'vitest';
import { StudentDetailComponent } from './student-detail.component';
import { ReportsService } from '../../../core/reports/reports.service';

async function flush(times = 5): Promise<void> {
  for (let i = 0; i < times; i++) {
    await Promise.resolve();
  }
}

describe('StudentDetailComponent', () => {
  const summary = {
    student_id: 's1',
    name: 'Eider Sánchez',
    knowledge_classification: 'average',
    profile: [
      { topic: 'POO', score: 0.8 },
      { topic: 'APIs', score: 0.4 },
    ],
    feedback: 'Buen avance en POO, reforzar APIs.',
  };

  function createComponent(id: string | null, detail: unknown, opts?: { reject?: Error; progress?: unknown }) {
    TestBed.resetTestingModule();
    const serviceMock = {
      getStudentSummary: opts?.reject
        ? vi.fn().mockRejectedValue(opts.reject)
        : vi.fn().mockResolvedValue(detail),
      getStudentProgress: vi.fn().mockResolvedValue(opts?.progress ?? null),
    };
    TestBed.configureTestingModule({
      imports: [StudentDetailComponent],
      providers: [
        provideRouter([]),
        { provide: ReportsService, useValue: serviceMock },
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap(id ? { id } : {}) } } },
      ],
    });
    const fixture = TestBed.createComponent(StudentDetailComponent);
    return { component: fixture.componentInstance, serviceMock };
  }

  it('loads the summary for the route id', async () => {
    const { component, serviceMock } = createComponent('s1', summary);
    await flush();
    expect(serviceMock.getStudentSummary).toHaveBeenCalledWith('s1');
    expect(component.summary()?.name).toBe('Eider Sánchez');
  });

  it('converts a score to a clamped percentage', () => {
    const { component } = createComponent('s1', summary);
    expect(component.scorePct(0.8)).toBe(80);
    expect(component.scorePct(1.5)).toBe(100);
    expect(component.scorePct(-0.2)).toBe(0);
  });

  it('lists progress topics ordered by index with score already in percent', async () => {
    const progress = {
      student_id: 's1',
      classification: 'Intermediate',
      knowledge_profile: [
        { topic: 'APIs', score: 40, index: 2 },
        { topic: 'POO', score: 85, index: 1 },
      ],
    };
    const { component } = createComponent('s1', summary, { progress });
    await flush();
    const topics = component.progressTopics();
    expect(topics.map((t) => t.topic)).toEqual(['POO', 'APIs']);
    expect(topics[0].score).toBe(85);
    expect(topics[1].score).toBe(40);
  });

  it('returns an empty progress list when there is no progress', async () => {
    const { component } = createComponent('s1', summary);
    await flush();
    expect(component.progressTopics()).toEqual([]);
  });

  it('shows an error message when there is no summary', async () => {
    const { component } = createComponent('s1', null);
    await flush();
    expect(component.loadError()).toContain('No hay reporte');
  });

  it('shows an error when the id is missing', () => {
    const { component, serviceMock } = createComponent(null, null);
    expect(serviceMock.getStudentSummary).not.toHaveBeenCalled();
    expect(component.loadError()).toContain('Falta el identificador');
  });

  it('captures a thrown error', async () => {
    const { component } = createComponent('s1', null, { reject: new Error('No tenés permisos') });
    await flush();
    expect(component.loadError()).toBe('No tenés permisos');
  });
});
