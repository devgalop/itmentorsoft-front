import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { vi } from 'vitest';
import { StudentDetailComponent } from './student-detail.component';
import { ReportsService } from '../../../core/reports/reports.service';
import { StudentAssessmentService } from '../../../core/assessments/student-assessment.service';

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
      { topic: 'POO', score: 80 },
      { topic: 'APIs', score: 40 },
    ],
    feedback: 'Buen avance en POO, reforzar APIs.',
  };

  function createComponent(
    id: string | null,
    detail: unknown,
    opts?: { reject?: Error; progress?: unknown; quantity?: number; quantityReject?: Error },
  ) {
    TestBed.resetTestingModule();
    const serviceMock = {
      getStudentSummary: opts?.reject
        ? vi.fn().mockRejectedValue(opts.reject)
        : vi.fn().mockResolvedValue(detail),
      getStudentProgress: vi.fn().mockResolvedValue(opts?.progress ?? null),
    };
    const studentAssessmentMock = {
      getQuantity: opts?.quantityReject
        ? vi.fn().mockRejectedValue(opts.quantityReject)
        : vi.fn().mockResolvedValue(opts?.quantity ?? 0),
    };
    TestBed.configureTestingModule({
      imports: [StudentDetailComponent],
      providers: [
        provideRouter([]),
        { provide: ReportsService, useValue: serviceMock },
        { provide: StudentAssessmentService, useValue: studentAssessmentMock },
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap(id ? { id } : {}) } } },
      ],
    });
    const fixture = TestBed.createComponent(StudentDetailComponent);
    return { component: fixture.componentInstance, serviceMock, studentAssessmentMock };
  }

  it('loads the summary for the route id', async () => {
    const { component, serviceMock } = createComponent('s1', summary);
    await flush();
    expect(serviceMock.getStudentSummary).toHaveBeenCalledWith('s1');
    expect(component.summary()?.name).toBe('Eider Sánchez');
  });

  it('builds the knowledge profile items with the score as a percentage', async () => {
    const { component } = createComponent('s1', summary);
    await flush();
    expect(component.profileItems()).toEqual([
      { key: 'POO', label: 'POO', value: 80 },
      { key: 'APIs', label: 'APIs', value: 40 },
    ]);
  });

  it('gives each profile topic the same color as its line in the progress chart', async () => {
    const progress = {
      student_id: 's1',
      classification: 'básico',
      knowledge_profile: [
        { topic: 'APIs', score: 10, index: 0 },
        { topic: 'POO', score: 90, index: 0 },
      ],
    };
    const { component } = createComponent('s1', summary, { progress });
    await flush();
    const colors = new Map(component.progressSeries().map((s) => [s.key, s.color]));
    const items = component.profileItems();
    expect(items.find((i) => i.key === 'POO')!.color).toBe(colors.get('POO'));
    expect(items.find((i) => i.key === 'APIs')!.color).toBe(colors.get('APIs'));
    expect(colors.get('POO')).not.toBe(colors.get('APIs'));
  });

  it('leaves the profile without its own colors when the progress is not available', async () => {
    const { component } = createComponent('s1', summary);
    await flush();
    expect(component.profileItems().every((i) => i.color === undefined)).toBe(true);
  });

  it('has no profile items before the summary loads', () => {
    const { component } = createComponent('s1', summary);
    expect(component.profileItems()).toEqual([]);
  });

  it('converts a score to a clamped percentage', () => {
    const { component } = createComponent('s1', summary);
    expect(component.scorePct(0.8)).toBe(80);
    expect(component.scorePct(1.5)).toBe(100);
    expect(component.scorePct(-0.2)).toBe(0);
  });

  it('builds one series per topic, joining its points by index with the score already in percent', async () => {
    const progress = {
      student_id: 's1',
      classification: 'básico',
      knowledge_profile: [
        { topic: 'APIs', score: 66.66666666666666, index: 1 },
        { topic: 'POO', score: 33.33333333333333, index: 0 },
        { topic: 'APIs', score: 0, index: 0 },
        { topic: 'POO', score: 100, index: 1 },
        { topic: 'APIs', score: 100, index: 2 },
      ],
    };
    const { component } = createComponent('s1', summary, { progress });
    await flush();
    const series = component.progressSeries();
    expect(series.map((s) => s.label)).toEqual(['APIs', 'POO']);
    expect(series[0]!.points).toEqual([
      { x: 0, value: 0 },
      { x: 1, value: 66.7 },
      { x: 2, value: 100 },
    ]);
    expect(series[1]!.points).toEqual([
      { x: 0, value: 33.3 },
      { x: 1, value: 100 },
    ]);
    expect(series[0]!.color).not.toBe(series[1]!.color);
  });

  it('clamps scores outside 0–100', async () => {
    const progress = {
      student_id: 's1',
      classification: 'básico',
      knowledge_profile: [
        { topic: 'APIs', score: 140, index: 0 },
        { topic: 'APIs', score: -5, index: 1 },
      ],
    };
    const { component } = createComponent('s1', summary, { progress });
    await flush();
    expect(component.progressSeries()[0]!.points.map((p) => p.value)).toEqual([100, 0]);
  });

  it('has no series when there is no progress', async () => {
    const { component } = createComponent('s1', summary);
    await flush();
    expect(component.progressSeries()).toEqual([]);
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
    const { component } = createComponent('s1', null, { reject: new Error('No tienes permisos') });
    await flush();
    expect(component.loadError()).toBe('No tienes permisos');
  });

  it('loads the assessments count alongside the summary', async () => {
    const { component, studentAssessmentMock } = createComponent('s1', summary, { quantity: 6 });
    await flush();
    expect(studentAssessmentMock.getQuantity).toHaveBeenCalledWith('s1');
    expect(component.assessmentsCount()).toBe(6);
  });

  it('keeps the rest of the report working when the count fails', async () => {
    const { component } = createComponent('s1', summary, {
      quantityReject: new Error('Sin conexión al servidor'),
    });
    await flush();
    expect(component.assessmentsCount()).toBeNull();
    expect(component.summary()?.name).toBe('Eider Sánchez');
  });

  it('derives the medal from the student classification', async () => {
    const { component } = createComponent('s1', { ...summary, knowledge_classification: 'Avanzado' });
    await flush();
    expect(component.medal()?.rank).toBe(3);
  });
});
