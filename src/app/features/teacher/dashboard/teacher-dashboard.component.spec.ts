import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { vi } from 'vitest';
import { TeacherDashboardComponent } from './teacher-dashboard.component';
import { UsersService } from '../../../core/users/users.service';
import { AuthService } from '../../../core/auth/auth.service';
import { ReportsService } from '../../../core/reports/reports.service';
import { ContentService } from '../../../core/content/content.service';
import { AssessmentsService } from '../../../core/assessments/assessments.service';

describe('TeacherDashboardComponent', () => {
  let fixture: ComponentFixture<TeacherDashboardComponent>;
  let component: TeacherDashboardComponent;
  let authMock: { user: ReturnType<typeof vi.fn>; userId: ReturnType<typeof vi.fn> };
  let usersMock: { getUser: ReturnType<typeof vi.fn> };
  let reportsMock: { getStudents: ReturnType<typeof vi.fn> };
  let contentMock: { getAllContents: ReturnType<typeof vi.fn> };
  let assessmentsMock: { getCategories: ReturnType<typeof vi.fn> };

  function student(id: string, cls: string) {
    return { student_id: id, student_name: 'Est ' + id, knowledge_classification: cls };
  }

  async function setup(): Promise<void> {
    await TestBed.configureTestingModule({
      imports: [TeacherDashboardComponent],
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: authMock },
        { provide: ReportsService, useValue: reportsMock },
        { provide: ContentService, useValue: contentMock },
        { provide: AssessmentsService, useValue: assessmentsMock },
        { provide: UsersService, useValue: usersMock },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(TeacherDashboardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await Promise.resolve();
    await Promise.resolve();
  }

  beforeEach(() => {
    authMock = {
      user: vi.fn(() => ({ userName: 'docente_test', role: 'teacher' })),
      userId: vi.fn(() => 't1'),
    };
    usersMock = {
      getUser: vi.fn().mockResolvedValue({
        user_id: 't1',
        username: 'docente_test',
        email: 'd@itm.co',
        name: 'Ana Gómez',
        role: 'teacher',
      }),
    };
    reportsMock = {
      getStudents: vi.fn().mockResolvedValue({
        students: [student('1', 'novice'), student('2', 'novice'), student('3', 'average')],
        total: 3,
      }),
    };
    contentMock = { getAllContents: vi.fn().mockResolvedValue([{}, {}]) };
    assessmentsMock = { getCategories: vi.fn().mockResolvedValue(['a', 'b', 'c', 'd']) };
  });

  it('greets the teacher with their real name', async () => {
    await setup();
    expect(usersMock.getUser).toHaveBeenCalledWith('t1');
    expect(component.userName()).toBe('Ana Gómez');
  });

  it('falls back to the username when the name cannot be loaded', async () => {
    usersMock.getUser.mockRejectedValue(new Error('x'));
    await setup();
    expect(component.userName()).toBe('docente_test');
  });

  it('falls back to the username when the user has no name', async () => {
    usersMock.getUser.mockResolvedValue({ user_id: 't1', username: 'docente_test', email: '', name: '  ', role: 'teacher' });
    await setup();
    expect(component.userName()).toBe('docente_test');
  });

  it('does not request the name when there is no user id', async () => {
    authMock.userId.mockReturnValue(null);
    await setup();
    expect(usersMock.getUser).not.toHaveBeenCalled();
    expect(component.userName()).toBe('docente_test');
  });

  it('fills the stat cards with real totals', async () => {
    await setup();
    expect(component.studentsTotal()).toBe(3);
    expect(component.categoriesTotal()).toBe(4);
    expect(component.resourcesTotal()).toBe(2);
  });

  it('builds the per-category breakdown with percentages', async () => {
    await setup();
    const byCat = component.byCategory();
    const novice = byCat.find((c) => c.category === 'novice');
    expect(novice?.count).toBe(2);
    expect(novice?.pct).toBe(67);
  });

  it('shows the most recent students', async () => {
    await setup();
    expect(component.recentStudents()).toHaveLength(3);
  });

  it('keeps a card as null when its endpoint fails', async () => {
    reportsMock.getStudents.mockRejectedValue(new Error('boom'));
    await setup();
    expect(component.studentsTotal()).toBeNull();
    // los otros igual cargan
    expect(component.categoriesTotal()).toBe(4);
    expect(component.resourcesTotal()).toBe(2);
  });

  it('builds initials from the student name', async () => {
    await setup();
    expect(component.initials('Eider Sánchez')).toBe('ES');
  });
});
