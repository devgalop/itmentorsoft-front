import { ComponentFixture, TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { ResourcesReportComponent } from './resources-report.component';
import { AssessmentsService } from '../../core/assessments/assessments.service';
import { ContentService } from '../../core/content/content.service';
import { ReportsService } from '../../core/reports/reports.service';

async function flush(times = 15): Promise<void> {
  for (let i = 0; i < times; i++) {
    await Promise.resolve();
  }
}

describe('ResourcesReportComponent', () => {
  let fixture: ComponentFixture<ResourcesReportComponent>;
  let contentMock: {
    getContentsByCategory: ReturnType<typeof vi.fn>;
    getContentsByTopic: ReturnType<typeof vi.fn>;
    getTopBestContent: ReturnType<typeof vi.fn>;
    getTopWorseContent: ReturnType<typeof vi.fn>;
  };
  let reportsMock: { getCategorySummary: ReturnType<typeof vi.fn> };
  let assessmentsMock: { getTopics: ReturnType<typeof vi.fn> };

  function setup(opts?: {
    byLevel?: Record<string, number>;
    studentsByLevel?: Record<string, number>;
    byTopic?: Record<string, number>;
    topics?: string[];
    topicsReject?: boolean;
    levelReject?: boolean;
    showTopContent?: boolean;
  }): ResourcesReportComponent {
    contentMock = {
      getContentsByCategory: vi.fn().mockImplementation(async (level: string) => {
        if (opts?.levelReject) throw new Error('x');
        return { items: [], total: opts?.byLevel?.[level] ?? 0 };
      }),
      getContentsByTopic: vi.fn().mockImplementation(async (topic: string) => ({
        items: [],
        total: opts?.byTopic?.[topic] ?? 0,
      })),
      getTopBestContent: vi.fn().mockResolvedValue([]),
      getTopWorseContent: vi.fn().mockResolvedValue([]),
    };
    reportsMock = {
      getCategorySummary: vi.fn().mockImplementation(async (level: string) => opts?.studentsByLevel?.[level] ?? 0),
    };
    assessmentsMock = {
      getTopics: opts?.topicsReject
        ? vi.fn().mockRejectedValue(new Error('x'))
        : vi.fn().mockResolvedValue(opts?.topics ?? []),
    };
    TestBed.configureTestingModule({
      imports: [ResourcesReportComponent],
      providers: [
        { provide: ContentService, useValue: contentMock },
        { provide: ReportsService, useValue: reportsMock },
        { provide: AssessmentsService, useValue: assessmentsMock },
      ],
    });
    fixture = TestBed.createComponent(ResourcesReportComponent);
    if (opts?.showTopContent === false) fixture.componentRef.setInput('showTopContent', false);
    fixture.detectChanges();
    return fixture.componentInstance;
  }

  it('counts the resources of each level in order, with 0 for the levels without any', async () => {
    const c = setup({ byLevel: { básico: 56, intermedio: 59 } });
    await flush();
    expect(contentMock.getContentsByCategory).toHaveBeenCalledWith('básico', 0, 1);
    expect(c.levelItems().map((i) => [i.label, i.count])).toEqual([
      ['Principiante', 0],
      ['Básico', 56],
      ['Intermedio', 59],
      ['Avanzado', 0],
    ]);
    expect(c.isLoading()).toBe(false);
  });

  it('warns about a level that has students but no resources', async () => {
    const c = setup({ byLevel: { básico: 5 }, studentsByLevel: { básico: 2, avanzado: 1 } });
    await flush();
    expect(c.gaps()).toEqual([{ label: 'Avanzado', students: 1 }]);
    fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).querySelector('.rr__alert')?.textContent).toContain(
      'Hay 1 estudiante(s) en el nivel Avanzado',
    );
  });

  it('does not warn when every level with students has resources or when nobody is there', async () => {
    const c = setup({ byLevel: { básico: 5 }, studentsByLevel: { básico: 2 } });
    await flush();
    expect(c.gaps()).toEqual([]);
    fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).querySelector('.rr__alert')).toBeNull();
  });

  it('lists the topics from the one with the most resources to the one with the fewest', async () => {
    const c = setup({ topics: ['A', 'B', 'C'], byTopic: { A: 2, B: 9, C: 2 } });
    await flush();
    expect(contentMock.getContentsByTopic).toHaveBeenCalledWith('B', 0, 1);
    expect(c.topicItems().map((i) => [i.label, i.count])).toEqual([
      ['B', 9],
      ['A', 2],
      ['C', 2],
    ]);
  });

  it('groups the topics that do not fit in the palette into "Otros"', async () => {
    const topics = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
    const c = setup({ topics, byTopic: { A: 8, B: 7, C: 6, D: 5, E: 4, F: 3, G: 2, H: 1 } });
    await flush();
    const items = c.topicItems();
    expect(items).toHaveLength(6);
    expect(items[5]).toMatchObject({ label: 'Otros (3)', count: 3 + 2 + 1 });
  });

  it('shows the best and worst rated resources inside the Recursos section', async () => {
    setup();
    await flush();
    fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).querySelector('app-top-content')).not.toBeNull();
  });

  it('hides the best and worst rated block when showTopContent is off', async () => {
    setup({ showTopContent: false });
    await flush();
    fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).querySelector('app-top-content')).toBeNull();
  });

  it('keeps the report usable when the topics cannot be loaded', async () => {
    const c = setup({ topicsReject: true, byLevel: { básico: 1 } });
    await flush();
    expect(c.topicItems()).toEqual([]);
    expect(c.levelItems()[1]!.count).toBe(1);
  });

  it('counts a failed query as 0 instead of breaking the report', async () => {
    const c = setup({ levelReject: true });
    await flush();
    expect(c.levelItems().every((i) => i.count === 0)).toBe(true);
    expect(c.isLoading()).toBe(false);
  });
});
