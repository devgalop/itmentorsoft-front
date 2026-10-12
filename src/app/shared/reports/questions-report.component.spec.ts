import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { vi } from 'vitest';
import { QuestionsReportComponent } from './questions-report.component';
import { ApprovalService } from '../../core/admin/approval.service';
import { AssessmentsService } from '../../core/assessments/assessments.service';

async function flush(times = 15): Promise<void> {
  for (let i = 0; i < times; i++) {
    await Promise.resolve();
  }
}

describe('QuestionsReportComponent', () => {
  let fixture: ComponentFixture<QuestionsReportComponent>;
  let assessmentsMock: { getLatestQuestions: ReturnType<typeof vi.fn> };
  let approvalMock: { getPending: ReturnType<typeof vi.fn> };

  function q(id: string, difficulty: string, classification: string, status: string) {
    return { question_id: id, difficulty, classification, status, text_to_evaluate: 't', version: 1 };
  }

  const sample = [
    q('1', 'básico', 'APIs', 'published'),
    q('2', 'intermedio', 'APIs', 'published'),
    q('3', 'avanzado', 'POO', 'published'),
    q('4', 'avanzado', 'POO', 'draft'),
    q('5', 'avanzado', '', 'archived'),
  ];

  function setup(opts?: {
    pages?: unknown[][];
    total?: number;
    reject?: boolean;
    pending?: number | 'fail';
    showPending?: boolean;
  }): QuestionsReportComponent {
    const pages = opts?.pages ?? [sample];
    assessmentsMock = {
      getLatestQuestions: opts?.reject
        ? vi.fn().mockRejectedValue(new Error('Sesión expirada, inicia sesión de nuevo'))
        : vi.fn().mockImplementation(async (page: number) => ({
            questions: pages[page] ?? [],
            total: opts?.total ?? pages.flat().length,
          })),
    };
    approvalMock = {
      getPending:
        opts?.pending === 'fail'
          ? vi.fn().mockRejectedValue(new Error('x'))
          : vi.fn().mockResolvedValue({ questions: [], total: opts?.pending ?? 0 }),
    };
    TestBed.configureTestingModule({
      imports: [QuestionsReportComponent],
      providers: [
        provideRouter([]),
        { provide: AssessmentsService, useValue: assessmentsMock },
        { provide: ApprovalService, useValue: approvalMock },
      ],
    });
    fixture = TestBed.createComponent(QuestionsReportComponent);
    if (opts?.showPending === false) fixture.componentRef.setInput('showPending', false);
    fixture.detectChanges();
    return fixture.componentInstance;
  }

  const el = () => fixture.nativeElement as HTMLElement;

  it('counts the questions by difficulty in order, from basic to advanced', async () => {
    const c = setup();
    await flush();
    expect(assessmentsMock.getLatestQuestions).toHaveBeenCalledWith(0, 100);
    expect(c.total()).toBe(5);
    expect(c.difficultyItems().map((i) => [i.label, i.count])).toEqual([
      ['Básico', 1],
      ['Intermedio', 1],
      ['Avanzado', 3],
    ]);
  });

  it('keeps an unexpected difficulty after the known ones', async () => {
    const c = setup({ pages: [[...sample, q('6', 'experto', 'APIs', 'published')]] });
    await flush();
    expect(c.difficultyItems().map((i) => i.label)).toEqual(['Básico', 'Intermedio', 'Avanzado', 'Experto']);
  });

  it('counts the questions by category, most first, grouping the blank ones as "Sin clasificar"', async () => {
    const c = setup();
    await flush();
    expect(c.categoryItems().map((i) => [i.label, i.count])).toEqual([
      ['APIs', 2],
      ['POO', 2],
      ['Sin clasificar', 1],
    ]);
  });

  it('groups the categories that do not fit in the palette into "Otros"', async () => {
    const many = Array.from({ length: 8 }, (_, i) => q('m' + i, 'básico', 'Cat ' + i, 'published'));
    const c = setup({ pages: [many] });
    await flush();
    const items = c.categoryItems();
    expect(items).toHaveLength(6);
    expect(items[5]!.label).toBe('Otros (3)');
  });

  it('counts the questions by status', async () => {
    const c = setup();
    await flush();
    expect(c.statusItems().map((i) => [i.label, i.count])).toEqual([
      ['Publicadas', 3],
      ['En borrador', 1],
      ['Archivadas', 1],
    ]);
  });

  it('walks through every page until it has all the questions', async () => {
    const c = setup({ pages: [[sample[0], sample[1]], [sample[2]], [sample[3], sample[4]]], total: 5 });
    await flush();
    expect(assessmentsMock.getLatestQuestions).toHaveBeenCalledTimes(3);
    expect(c.total()).toBe(5);
  });

  it('shows the pending approvals with a link when there are some', async () => {
    setup({ pending: 3 });
    await flush();
    fixture.detectChanges();
    const alert = el().querySelector('.qr__alert');
    expect(alert?.textContent).toContain('3 pregunta(s) esperan aprobación');
    expect(alert?.querySelector('a')?.getAttribute('href')).toBe('/admin/content-approval');
  });

  it('does not ask for the pending approvals when showPending is off (teacher)', async () => {
    const c = setup({ pending: 3, showPending: false });
    await flush();
    fixture.detectChanges();
    expect(approvalMock.getPending).not.toHaveBeenCalled();
    expect(c.pendingTotal()).toBeNull();
    expect(el().querySelector('.qr__alert')).toBeNull();
    expect(c.total()).toBe(5);
  });

  it('does not show the warning when nothing is pending or the count is unavailable', async () => {
    setup({ pending: 0 });
    await flush();
    fixture.detectChanges();
    expect(el().querySelector('.qr__alert')).toBeNull();
    TestBed.resetTestingModule();
    const c = setup({ pending: 'fail' });
    await flush();
    expect(c.pendingTotal()).toBeNull();
  });

  it('shows the error message when the questions cannot be loaded', async () => {
    const c = setup({ reject: true });
    await flush();
    fixture.detectChanges();
    expect(c.loadError()).toBe('Sesión expirada, inicia sesión de nuevo');
    expect(c.total()).toBe(0);
    expect(el().querySelector('[role="alert"]')?.textContent).toContain('Sesión expirada');
  });
});
