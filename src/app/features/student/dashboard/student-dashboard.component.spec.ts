import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { vi } from 'vitest';
import { UsersService } from '../../../core/users/users.service';
import { StudentDashboardComponent } from './student-dashboard.component';
import { AuthService } from '../../../core/auth/auth.service';
import { StudentAssessmentService } from '../../../core/assessments/student-assessment.service';
import { ReportsService } from '../../../core/reports/reports.service';
import { ContentService } from '../../../core/content/content.service';
import { GradingWatcherService } from '../../../core/assessments/grading-watcher.service';

async function flush(): Promise<void> {
  await new Promise((r) => setTimeout(r));
  await new Promise((r) => setTimeout(r));
}

interface SetupOptions {
  userId?: string | null;
  quantity?: number;
  quantityReject?: Error;
  classification?: string | null;
  knowledge?: { topic: string; score: number; index: number }[];
  progressReject?: Error;
  profile?: { topic: string; score: number }[];
  feedback?: string;
  history?: { assessment_id: string; score: number; date_taken: string; classification: string | null }[];
  historyReject?: Error;
  name?: string | null;
  nameReject?: Error;
  pending?: boolean;
  route?: unknown[];
  routeReject?: Error;
  pendingIds?: string[];
}

describe('StudentDashboardComponent', () => {
  let component: StudentDashboardComponent;
  let fixture: ComponentFixture<StudentDashboardComponent>;
  let studentAssessmentMock: { getQuantity: ReturnType<typeof vi.fn>; getAssessmentsSummary: ReturnType<typeof vi.fn> };
  let reportsMock: { getStudentProgress: ReturnType<typeof vi.fn>; getStudentSummary: ReturnType<typeof vi.fn> };
  let usersMock: { getUser: ReturnType<typeof vi.fn> };
  let contentMock: { getCompleteLearningPaths: ReturnType<typeof vi.fn>; getContentById: ReturnType<typeof vi.fn> };
  let completedCount: ReturnType<typeof signal<number>>;

  const el = () => fixture.nativeElement as HTMLElement;
  const text = () => el().textContent ?? '';
  const startBtn = () =>
    Array.from(el().querySelectorAll('.dash__banner a')).find((a) => a.textContent?.includes('Iniciar evaluación'));

  async function setup(
    user: { userName: string; role: string } | null = { userName: 'eider_student', role: 'student' },
    opts: SetupOptions = {},
  ): Promise<void> {
    const userId = 'userId' in opts ? opts.userId : 's1';
    studentAssessmentMock = {
      getQuantity: opts.quantityReject
        ? vi.fn().mockRejectedValue(opts.quantityReject)
        : vi.fn().mockResolvedValue(opts.quantity ?? 0),
      getAssessmentsSummary: opts.historyReject
        ? vi.fn().mockRejectedValue(opts.historyReject)
        : vi.fn().mockResolvedValue(opts.history ?? []),
    };
    reportsMock = {
      getStudentProgress: opts.progressReject
        ? vi.fn().mockRejectedValue(opts.progressReject)
        : vi.fn().mockResolvedValue(
            opts.classification
              ? { student_id: 's1', classification: opts.classification, knowledge_profile: opts.knowledge ?? [] }
              : null,
          ),
      getStudentSummary: vi.fn().mockResolvedValue(
        opts.profile || opts.feedback
          ? {
              student_id: 's1',
              name: 'X',
              knowledge_classification: opts.classification ?? '',
              profile: opts.profile ?? [],
              feedback: opts.feedback ?? '',
            }
          : null,
      ),
    };
    usersMock = {
      getUser: opts.nameReject
        ? vi.fn().mockRejectedValue(opts.nameReject)
        : vi.fn().mockResolvedValue(
            opts.name == null
              ? null
              : { user_id: 's1', username: 'eider_student', email: '', name: opts.name, role: 'student' },
          ),
    };

    completedCount = signal(0);
    contentMock = {
      getCompleteLearningPaths: opts.routeReject
        ? vi.fn().mockRejectedValue(opts.routeReject)
        : vi.fn().mockResolvedValue(opts.route ?? []),
      getContentById: vi.fn().mockResolvedValue({ url: 'https://ejemplo.com/recurso' }),
    };
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      imports: [StudentDashboardComponent],
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: { user: vi.fn(() => user), userId: vi.fn(() => userId) } },
        { provide: StudentAssessmentService, useValue: studentAssessmentMock },
        { provide: ReportsService, useValue: reportsMock },
        { provide: UsersService, useValue: usersMock },
        { provide: ContentService, useValue: contentMock },
        {
          provide: GradingWatcherService,
          useValue: {
            hasPending: () => !!opts.pending,
            isPendingId: (id: string) => (opts.pendingIds ?? []).includes(id),
            completedCount,
          },
        },
      ],
    });
    fixture = TestBed.createComponent(StudentDashboardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await flush();
    fixture.detectChanges();
  }

  it('creates successfully', async () => {
    await setup();
    expect(component).toBeTruthy();
  });

  describe('greeting', () => {
    it('greets with the username from the JWT', async () => {
      await setup();
      expect(el().querySelector('.dash__greeting')?.textContent).toContain('eider_student');
    });

    it('greets with the real name once it loads', async () => {
      await setup(undefined, { name: 'Eider Sánchez' });
      expect(el().querySelector('.dash__greeting')?.textContent).toContain('Eider Sánchez');
    });

    it('keeps the username when the name cannot be loaded', async () => {
      await setup(undefined, { nameReject: new Error('x') });
      expect(component.userName()).toBe('eider_student');
    });

    it('does not request anything when there is no user id', async () => {
      await setup(undefined, { userId: null });
      expect(usersMock.getUser).not.toHaveBeenCalled();
      expect(reportsMock.getStudentProgress).not.toHaveBeenCalled();
      expect(studentAssessmentMock.getAssessmentsSummary).not.toHaveBeenCalled();
    });

    it('falls back to "Estudiante" when there is no user', async () => {
      await setup(null);
      expect(component.userName()).toBe('Estudiante');
    });
  });

  describe('banner', () => {
    it('shows only the current level medal, and no start button, once there is an evaluation', async () => {
      await setup(undefined, { quantity: 2, classification: 'Básico' });
      expect(el().querySelectorAll('.dash__medal')).toHaveLength(1);
      expect(el().querySelector('.dash__medal')?.textContent).toContain('Básico');
      expect(startBtn()).toBeUndefined();
      expect(text()).not.toContain('Sigue evaluándote');
    });

    it('shows the start button and no medal when the student has no evaluation yet', async () => {
      await setup(undefined, { quantity: 0 });
      expect(startBtn()).toBeDefined();
      expect(el().querySelector('.dash__medal')).toBeNull();
      expect(el().querySelector('.dash__badge')?.textContent?.trim()).toBe('Sin categoría asignada aún');
    });

    it('hides the start button when there is at least one evaluation', async () => {
      await setup(undefined, { quantity: 1 });
      expect(startBtn()).toBeUndefined();
    });

    it('does not flash the start button while the status is loading', () => {
      void setup(undefined, { quantity: 0 });
      expect(startBtn()).toBeUndefined();
    });

    it('adds one more detail to each medal: ribbon, then star, then crown and wings', async () => {
      const found: Record<string, boolean[]> = { ribbon: [], star: [], crown: [], wing: [] };
      for (const level of ['Principiante', 'Básico', 'Intermedio', 'Avanzado']) {
        await setup(undefined, { quantity: 1, classification: level });
        for (const k of Object.keys(found)) {
          found[k]!.push(el().querySelector('.dash__medal')?.querySelector('.medal__' + k) != null);
        }
      }
      expect(found['ribbon']).toEqual([false, true, true, true]);
      expect(found['star']).toEqual([false, false, true, true]);
      expect(found['crown']).toEqual([false, false, false, true]);
      expect(found['wing']).toEqual([false, false, false, true]);
    });
  });

  describe('last evaluation card', () => {
    const history = [
      { assessment_id: 'a1', score: 0.5, date_taken: '2026-10-01T10:00:00', classification: 'básico' },
      { assessment_id: 'a3', score: 0.8, date_taken: '2026-10-05T10:00:00', classification: 'intermedio' },
      { assessment_id: 'a2', score: 0.62, date_taken: '2026-10-03T10:00:00', classification: 'básico' },
    ];

    it('shows the score of the most recent evaluation and the change versus the previous one', async () => {
      await setup(undefined, { quantity: 3, classification: 'Intermedio', history });
      expect(component.last()?.score).toBe(80);
      expect(component.last()?.delta).toBe(18);
      expect(text()).toContain('80%');
      expect(text()).toContain('+18 pts');
    });

    it('draws a mini chart only when there are at least two evaluations', async () => {
      await setup(undefined, { quantity: 3, classification: 'Intermedio', history });
      expect(el().querySelector('.dash__spark polyline')).not.toBeNull();
      await setup(undefined, { quantity: 1, classification: 'Básico', history: [history[0]!] });
      expect(el().querySelector('.dash__spark')).toBeNull();
      expect(component.last()?.delta).toBeNull();
    });

    it('shows a drop with its own sign', async () => {
      await setup(undefined, { quantity: 2, history: [history[1]!, history[0]!] });
      // la más reciente por fecha es a3 (80) y la anterior a1 (50): sube
      expect(component.last()?.delta).toBe(30);
      await setup(undefined, {
        quantity: 2,
        history: [
          { ...history[0]!, date_taken: '2026-10-09T10:00:00' },
          { ...history[1]!, date_taken: '2026-10-02T10:00:00' },
        ],
      });
      expect(component.last()?.delta).toBe(-30);
      expect(text()).toContain('30 pts');
    });

    it('links the card straight to the result of the most recent evaluation', async () => {
      await setup(undefined, { quantity: 3, classification: 'Intermedio', history });
      expect(component.lastParams()).toEqual({ result: 'a3' });
      const card = Array.from(el().querySelectorAll('.dash__stat')).find((a) => a.textContent?.includes('Última evaluación'));
      expect(card?.getAttribute('href')).toContain('result=a3');
    });

    it('shows an empty state when there is no evaluation or the history fails', async () => {
      await setup(undefined, { quantity: 0 });
      expect(component.last()).toBeNull();
      expect(text()).toContain('Aún sin evaluaciones');
      await setup(undefined, { quantity: 1, historyReject: new Error('x') });
      expect(component.last()).toBeNull();
    });
  });

  describe('counters and shortcuts', () => {
    it('shows the real count of evaluations', async () => {
      await setup(undefined, { quantity: 4 });
      expect(component.evaluationsTotal()).toBe(4);
    });

    it('keeps the count at 0 when the request fails', async () => {
      await setup(undefined, { quantityReject: new Error('x') });
      expect(component.evaluationsTotal()).toBe(0);
    });

    it('opens the topic selection directly from every "new evaluation" link', async () => {
      await setup(undefined, { quantity: 0 });
      const links = Array.from(el().querySelectorAll('a')).filter((a) =>
        /Iniciar evaluación|Comenzar ahora/.test(a.textContent ?? ''),
      );
      expect(links.length).toBeGreaterThan(0);
      for (const a of links) expect(a.getAttribute('href')).toContain('new=1');
      await setup(undefined, {
        quantity: 1,
        classification: 'Básico',
        profile: [
          { topic: 'A', score: 0.9 },
          { topic: 'B', score: 0.2 },
        ],
      });
      const next = Array.from(el().querySelectorAll('a')).find((a) => a.textContent?.includes('Nueva evaluación'));
      expect(next?.getAttribute('href')).toContain('new=1');
    });

    it('links to the route page', async () => {
      await setup();
      expect(el().querySelector('a[href="/student/route"]')?.textContent).toContain('Mi ruta');
    });
  });

  describe('knowledge profile and next step', () => {
    const profile = [
      { topic: 'POO', score: 0.9 },
      { topic: 'APIs', score: 0.3 },
    ];
    const knowledge = [
      { topic: 'POO', score: 90, index: 0 },
      { topic: 'APIs', score: 30, index: 0 },
    ];

    it('shows the profile bars with the colors of each topic', async () => {
      await setup(undefined, { quantity: 1, classification: 'Básico', profile, knowledge });
      expect(el().querySelectorAll('.sbr__row, app-score-bars li').length).toBeGreaterThan(0);
      expect(component.profileItems().map((i) => [i.key, i.value])).toEqual([
        ['POO', 90],
        ['APIs', 30],
      ]);
      expect(component.profileItems().every((i) => !!i.color)).toBe(true);
    });

    it('suggests reinforcing the weakest topic and mentions the strongest', async () => {
      await setup(undefined, { quantity: 1, classification: 'Básico', profile, knowledge });
      expect(component.weakest()?.key).toBe('APIs');
      expect(component.strongest()?.key).toBe('POO');
      expect(text()).toContain('Refuerza');
      expect(text()).toContain('APIs');
      expect(el().querySelector('a[href="/student/explore"]')).not.toBeNull();
    });

    it('does not name a weakest topic when every score is equal', async () => {
      await setup(undefined, {
        quantity: 1,
        classification: 'Básico',
        profile: [
          { topic: 'A', score: 0.5 },
          { topic: 'B', score: 0.5 },
        ],
      });
      expect(component.weakest()).toBeNull();
      expect(text()).toContain('Sigue practicando');
    });

    it('invites a student without evaluations to take the initial one', async () => {
      await setup(undefined, { quantity: 0 });
      expect(text()).toContain('Haz tu evaluación inicial');
      expect(text()).toContain('Sin datos de perfil todavía');
    });
  });

  describe('feedback', () => {
    it('shows the personalized feedback', async () => {
      await setup(undefined, { quantity: 1, classification: 'Básico', feedback: 'Buen avance en POO.' });
      expect(text()).toContain('Buen avance en POO.');
    });

    it('hides the card when the backend sends only the placeholder', async () => {
      await setup(undefined, {
        quantity: 1,
        classification: 'Básico',
        feedback: 'Feedback will be generated based on the student profile',
      });
      expect(component.feedback()).toBeNull();
      expect(text()).not.toContain('Feedback para ti');
    });
  });

  describe('evaluación pendiente en el historial', () => {
    const done = { assessment_id: 'a1', score: 0.8, date_taken: '2026-10-01T10:00:00', classification: 'básico' };
    const pendingRow = { assessment_id: 'a2', score: 0, date_taken: '2026-10-05T10:00:00', classification: null };

    it('does not show the pending evaluation (score 0) as the last one', async () => {
      await setup(undefined, { quantity: 2, pending: true, pendingIds: ['a2'], history: [done, pendingRow] });
      expect(component.last()?.score).toBe(80);
      expect(component.last()?.delta).toBeNull();
      expect(text()).toContain('Calificando una evaluación nueva');
    });

    it('shows "Calificando…" instead of a 0% when the only evaluation is the pending one', async () => {
      await setup(undefined, { quantity: 1, pending: true, pendingIds: ['a2'], history: [pendingRow] });
      expect(component.last()).toBeNull();
      expect(text()).toContain('Calificando…');
      expect(text()).not.toContain('0%');
    });

    it('keeps an evaluation without result that is not pending (it never finished)', async () => {
      await setup(undefined, { quantity: 1, history: [pendingRow] });
      expect(component.last()?.score).toBe(0);
    });
  });

  describe('calificación en curso', () => {
    it('shows "Calificando…" in the banner and the last evaluation card, without the start button', async () => {
      await setup(undefined, { quantity: 0, pending: true });
      expect(el().querySelector('.dash__badge')?.textContent?.trim()).toBe('Calificando…');
      expect(text()).toContain('Estamos calificando tu evaluación');
      expect(text()).toContain('Te avisaremos cuando termine');
      expect(startBtn()).toBeUndefined();
      expect(text()).not.toContain('Completa tu evaluación inicial');
    });

    it('explains that the profile and the next step will appear when it finishes', async () => {
      await setup(undefined, { quantity: 0, pending: true });
      expect(text()).toContain('tu perfil aparecerá aquí');
      expect(text()).toContain('Cuando termine la calificación verás aquí tu siguiente paso');
    });

    it('keeps the previous score and adds a note when a new evaluation is being graded', async () => {
      await setup(undefined, {
        quantity: 1,
        classification: 'Básico',
        pending: true,
        history: [{ assessment_id: 'a1', score: 0.5, date_taken: '2026-10-01T10:00:00', classification: 'básico' }],
      });
      expect(text()).toContain('50%');
      expect(text()).toContain('Calificando una evaluación nueva');
    });

    it('does not mention any grading when nothing is pending', async () => {
      await setup(undefined, { quantity: 0 });
      expect(text()).not.toContain('Calificando');
    });

    it('reloads the data when a grading finishes, but not on the first load', async () => {
      await setup(undefined, { quantity: 1, classification: 'Básico' });
      const calls = reportsMock.getStudentProgress.mock.calls.length;
      completedCount.set(1);
      fixture.detectChanges();
      await flush();
      expect(reportsMock.getStudentProgress.mock.calls.length).toBe(calls + 1);
      expect(studentAssessmentMock.getAssessmentsSummary.mock.calls.length).toBeGreaterThan(1);
    });
  });

  describe('recursos para el tema más débil', () => {
    const profile = [
      { topic: 'POO', score: 0.9 },
      { topic: 'APIs', score: 0.3 },
    ];
    const route = [
      {
        topic: 'APIs',
        topic_path_id: 'p2',
        contents: [
          { content_id: 'c1', title: 'REST', description: '', rating: 4, is_completed: true },
          { content_id: 'c2', title: 'HTTP', description: '', rating: 4, is_completed: false },
          { content_id: 'c3', title: 'Verbos', description: '', rating: 4 },
          { content_id: 'c4', title: 'Otro', description: '', rating: 4 },
        ],
      },
      { topic: 'POO', topic_path_id: 'p1', contents: [{ content_id: 'z', title: 'Clases', description: '', rating: 4 }] },
    ];

    it('suggests up to two resources of the weakest topic that are not seen yet', async () => {
      await setup(undefined, { quantity: 1, classification: 'Básico', profile, route });
      expect(component.weakResources().map((r) => r.title)).toEqual(['HTTP', 'Verbos']);
      expect(text()).toContain('HTTP');
      expect(text()).not.toContain('REST');
    });

    it('matches the topic ignoring case and spaces', async () => {
      await setup(undefined, { quantity: 1, classification: 'Básico', profile, route: [{ ...route[0]!, topic: '  apis ' }] });
      expect(component.weakResources()).toHaveLength(2);
    });

    it('suggests nothing when the student has no route or the topic is not in it', async () => {
      await setup(undefined, { quantity: 1, classification: 'Básico', profile, route: [] });
      expect(component.weakResources()).toEqual([]);
      await setup(undefined, { quantity: 1, classification: 'Básico', profile, route: [route[1]!] });
      expect(component.weakResources()).toEqual([]);
    });

    it('keeps working when the route cannot be loaded', async () => {
      await setup(undefined, { quantity: 1, classification: 'Básico', profile, routeReject: new Error('x') });
      expect(component.weakResources()).toEqual([]);
      expect(text()).toContain('Refuerza');
    });

    it('opens a suggested resource in a new tab', async () => {
      const open = vi.spyOn(window, 'open').mockImplementation(() => null);
      await setup(undefined, { quantity: 1, classification: 'Básico', profile, route });
      await component.openResource('c2');
      expect(contentMock.getContentById).toHaveBeenCalledWith('c2');
      expect(open).toHaveBeenCalledWith('https://ejemplo.com/recurso', '_blank', 'noopener');
      expect(component.openingId()).toBeNull();
      open.mockRestore();
    });

    it('does not open anything when the resource has no url', async () => {
      const open = vi.spyOn(window, 'open').mockImplementation(() => null);
      await setup(undefined, { quantity: 1, classification: 'Básico', profile, route });
      contentMock.getContentById.mockResolvedValue(null);
      await component.openResource('c2');
      expect(open).not.toHaveBeenCalled();
      open.mockRestore();
    });
  });
});
