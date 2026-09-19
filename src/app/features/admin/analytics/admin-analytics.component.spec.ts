import { TestBed } from '@angular/core/testing';
import { ComponentFixture } from '@angular/core/testing';
import { vi } from 'vitest';
import { AdminAnalyticsComponent } from './admin-analytics.component';
import { ReportsService } from '../../../core/reports/reports.service';
import { UsersService } from '../../../core/users/users.service';

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

  function setup(opts?: {
    roles?: string[];
    rolesReject?: Error;
    byRole?: Record<string, number>;
    byRoleReject?: Error;
    byCategory?: Record<string, number>;
  }): void {
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
});
