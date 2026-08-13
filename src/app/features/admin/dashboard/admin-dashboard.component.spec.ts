import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { vi } from 'vitest';
import { AdminDashboardComponent } from './admin-dashboard.component';
import { ReportsService } from '../../../core/reports/reports.service';
import { ContentService } from '../../../core/content/content.service';
import { UsersService } from '../../../core/users/users.service';
import { ApprovalService } from '../../../core/admin/approval.service';

describe('AdminDashboardComponent', () => {
  let fixture: ComponentFixture<AdminDashboardComponent>;
  let component: AdminDashboardComponent;
  let reportsMock: { getStudents: ReturnType<typeof vi.fn> };
  let contentMock: { getAllContents: ReturnType<typeof vi.fn> };
  let usersMock: { getAvailableRoles: ReturnType<typeof vi.fn> };
  let approvalMock: { getPending: ReturnType<typeof vi.fn> };

  function student(id: string) {
    return { student_id: id, student_name: 'Est ' + id, knowledge_classification: 'novice' };
  }

  async function setup(): Promise<void> {
    await TestBed.configureTestingModule({
      imports: [AdminDashboardComponent],
      providers: [
        provideRouter([]),
        { provide: ReportsService, useValue: reportsMock },
        { provide: ContentService, useValue: contentMock },
        { provide: UsersService, useValue: usersMock },
        { provide: ApprovalService, useValue: approvalMock },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(AdminDashboardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await Promise.resolve();
    await Promise.resolve();
  }

  beforeEach(() => {
    reportsMock = {
      getStudents: vi.fn().mockResolvedValue({
        students: [student('1'), student('2')],
        total: 2,
      }),
    };
    contentMock = { getAllContents: vi.fn().mockResolvedValue([{}, {}, {}]) };
    usersMock = { getAvailableRoles: vi.fn().mockResolvedValue(['admin', 'teacher', 'student']) };
    approvalMock = { getPending: vi.fn().mockResolvedValue({ questions: [], total: 4 }) };
  });

  it('fills all four stat cards with real data', async () => {
    await setup();
    expect(component.studentsTotal()).toBe(2);
    expect(component.rolesTotal()).toBe(3);
    expect(component.resourcesTotal()).toBe(3);
    expect(component.pendingTotal()).toBe(4);
  });

  it('shows recent students in the users panel', async () => {
    await setup();
    expect(component.recentStudents()).toHaveLength(2);
  });

  it('calls the pending endpoint with a minimal page', async () => {
    await setup();
    expect(approvalMock.getPending).toHaveBeenCalledWith(0, 1);
  });

  it('keeps a card null when its endpoint fails but loads the rest', async () => {
    approvalMock.getPending.mockRejectedValue(new Error('boom'));
    await setup();
    expect(component.pendingTotal()).toBeNull();
    expect(component.rolesTotal()).toBe(3);
    expect(component.resourcesTotal()).toBe(3);
    expect(component.studentsTotal()).toBe(2);
  });

  it('builds initials from the student name', async () => {
    await setup();
    expect(component.initials('Ana Lopez')).toBe('AL');
  });
});
