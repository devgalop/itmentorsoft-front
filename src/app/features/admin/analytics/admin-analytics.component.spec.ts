import { TestBed } from '@angular/core/testing';
import { ComponentFixture } from '@angular/core/testing';
import { vi } from 'vitest';
import { AdminAnalyticsComponent } from './admin-analytics.component';
import { ReportsService } from '../../../core/reports/reports.service';
import { UsersService } from '../../../core/users/users.service';
import { AssessmentsService } from '../../../core/assessments/assessments.service';
import { ContentService } from '../../../core/content/content.service';

async function flush(times = 5): Promise<void> {
  for (let i = 0; i < times; i++) {
    await Promise.resolve();
  }
}

describe('AdminAnalyticsComponent', () => {
  let fixture: ComponentFixture<AdminAnalyticsComponent>;
  let reportsMock: {
    getUsersByRoleTotal: ReturnType<typeof vi.fn>;
    getCategorySummary: ReturnType<typeof vi.fn>;
  };
  let usersServiceMock: { getAvailableRoles: ReturnType<typeof vi.fn> };
  let assessmentsMock: { getTopics: ReturnType<typeof vi.fn> };
  let contentMock: {
    getTopBestContent: ReturnType<typeof vi.fn>;
    getTopWorseContent: ReturnType<typeof vi.fn>;
  };

  function setup(opts?: {
    roles?: string[];
    rolesReject?: Error;
    byRole?: Record<string, number>;
    byRoleReject?: Error;
    byCategory?: Record<string, number>;
    topics?: string[];
    topBest?: unknown[];
    topWorse?: unknown[];
    topBestReject?: Error;
  }): void {
    assessmentsMock = { getTopics: vi.fn().mockResolvedValue(opts?.topics ?? ['APIs', 'POO']) };
    contentMock = {
      getTopBestContent: opts?.topBestReject
        ? vi.fn().mockRejectedValue(opts.topBestReject)
        : vi.fn().mockResolvedValue(opts?.topBest ?? []),
      getTopWorseContent: vi.fn().mockResolvedValue(opts?.topWorse ?? []),
    };
    usersServiceMock = {
      getAvailableRoles: opts?.rolesReject
        ? vi.fn().mockRejectedValue(opts.rolesReject)
        : vi.fn().mockResolvedValue(opts?.roles ?? ['admin', 'teacher', 'student']),
    };
    reportsMock = {
      getUsersByRoleTotal: opts?.byRoleReject
        ? vi.fn().mockRejectedValue(opts.byRoleReject)
        : vi.fn().mockImplementation(async (role: string) => opts?.byRole?.[role] ?? 0),
      getCategorySummary: vi
        .fn()
        .mockImplementation(async (category: string) => opts?.byCategory?.[category] ?? 0),
    };

    TestBed.configureTestingModule({
      imports: [AdminAnalyticsComponent],
      providers: [
        { provide: ReportsService, useValue: reportsMock },
        { provide: UsersService, useValue: usersServiceMock },
        { provide: AssessmentsService, useValue: assessmentsMock },
        { provide: ContentService, useValue: contentMock },
      ],
    });

    fixture = TestBed.createComponent(AdminAnalyticsComponent);
    fixture.detectChanges();
  }

  it('creates successfully', () => {
    setup();
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('loads the users-by-role distribution using the available roles', async () => {
    setup({ roles: ['admin', 'teacher', 'student'], byRole: { admin: 1, teacher: 2, student: 7 } });
    await flush();
    fixture.detectChanges();

    const c = fixture.componentInstance;
    expect(usersServiceMock.getAvailableRoles).toHaveBeenCalled();
    expect(reportsMock.getUsersByRoleTotal).toHaveBeenCalledWith('admin');
    expect(reportsMock.getUsersByRoleTotal).toHaveBeenCalledWith('teacher');
    expect(reportsMock.getUsersByRoleTotal).toHaveBeenCalledWith('student');
    expect(c.usersByRoleTotal()).toBe(10);
  });

  it('maps role codes to Spanish labels', () => {
    setup();
    const c = fixture.componentInstance;
    expect(c.roleLabel('admin')).toBe('Administrador');
    expect(c.roleLabel('teacher')).toBe('Docente');
    expect(c.roleLabel('student')).toBe('Estudiante');
    expect(c.roleLabel('other')).toBe('other');
  });

  it('loads the students-by-category distribution for the 4 known categories', async () => {
    setup({ byCategory: { principiante: 3, básico: 2, intermedio: 1, avanzado: 4 } });
    await flush();
    fixture.detectChanges();

    const c = fixture.componentInstance;
    expect(reportsMock.getCategorySummary).toHaveBeenCalledTimes(4);
    expect(c.studentsByCategory().length).toBe(4);
    expect(c.studentsByCategoryTotal()).toBe(10);
  });

  it('keeps the users-by-role distribution empty when roles fail to load', async () => {
    setup({ rolesReject: new Error('Sin conexión al servidor') });
    await flush();

    const c = fixture.componentInstance;
    expect(c.usersByRole()).toEqual([]);
    expect(c.isLoadingUsersByRole()).toBe(false);
  });

  it('falls back to 0 for a role whose count request fails', async () => {
    setup({ roles: ['admin'], byRoleReject: new Error('Sin conexión al servidor') });
    await flush();

    const c = fixture.componentInstance;
    expect(c.usersByRole()).toEqual([{ value: 'admin', label: 'Administrador', count: 0 }]);
  });
  describe('top content', () => {
    const best = [{ content_id: 'c1', title: 'Capas', summary: '', rating: 4.8 }];
    const worse = [{ content_id: 'c2', title: 'Intro', summary: '', rating: 1.2 }];

    it('loads the best and worst content of the first topic', async () => {
      setup({ topBest: best, topWorse: worse });
      await flush(10);
      const c = fixture.componentInstance;
      expect(contentMock.getTopBestContent).toHaveBeenCalledWith('APIs');
      expect(contentMock.getTopWorseContent).toHaveBeenCalledWith('APIs');
      expect(c.selectedTopic()).toBe('APIs');
      expect(c.topBest()).toEqual(best);
      expect(c.topWorse()).toEqual(worse);
      expect(c.isLoadingTop()).toBe(false);
      expect(c.topUnavailable()).toBe(false);
    });

    it('reloads when the topic changes', async () => {
      setup({ topBest: best, topWorse: worse });
      await flush(10);
      fixture.componentInstance.onTopicChange('POO');
      await flush(10);
      expect(contentMock.getTopBestContent).toHaveBeenLastCalledWith('POO');
      expect(fixture.componentInstance.selectedTopic()).toBe('POO');
    });

    it('keeps the other list and flags the failure when one request fails', async () => {
      setup({ topBestReject: new Error('x'), topWorse: worse });
      await flush(10);
      const c = fixture.componentInstance;
      expect(c.topBest()).toEqual([]);
      expect(c.topWorse()).toEqual(worse);
      expect(c.topUnavailable()).toBe(true);
    });

    it('does not query when there are no topics', async () => {
      setup({ topics: [] });
      await flush(10);
      expect(contentMock.getTopBestContent).not.toHaveBeenCalled();
      expect(fixture.componentInstance.topics()).toEqual([]);
    });

    it('formatRating shows a single decimal', () => {
      setup();
      const c = fixture.componentInstance;
      expect(c.formatRating(4.333333333333333)).toBe('4.3');
      expect(c.formatRating(4)).toBe('4.0');
      expect(c.formatRating(1)).toBe('1.0');
    });

    it('stars clamps the rating between 0 and 5', async () => {
      setup();
      const c = fixture.componentInstance;
      expect(c.stars(4.5)).toBe(5);
      expect(c.stars(-1)).toBe(0);
      expect(c.stars(9)).toBe(5);
    });
  });
});
