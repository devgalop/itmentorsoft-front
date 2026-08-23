import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { vi } from 'vitest';
import { StudentLayoutComponent } from './student-layout.component';
import { SidebarService } from '../../../shared/ui/sidebar/sidebar.service';
import { AuthService } from '../../../core/auth/auth.service';
import { STUDENT_NAV_ITEMS } from './student-nav-items';
import { InitialAssessmentService } from '../../../core/student/initial-assessment.service';

describe('StudentLayoutComponent', () => {
  let component: StudentLayoutComponent;
  let fixture: ComponentFixture<StudentLayoutComponent>;
  let sidebarServiceMock: { isCollapsed: ReturnType<typeof vi.fn> };
  let authServiceMock: { logout: ReturnType<typeof vi.fn> };
  let initialAssessmentMock: { hasCompleted: ReturnType<typeof vi.fn> };

  beforeEach(async () => {
    sidebarServiceMock = { isCollapsed: vi.fn(() => false) };
    authServiceMock = { logout: vi.fn() };
    initialAssessmentMock = { hasCompleted: vi.fn().mockResolvedValue(true) };

    await TestBed.configureTestingModule({
      imports: [StudentLayoutComponent],
      providers: [
        provideRouter([]),
        { provide: SidebarService, useValue: sidebarServiceMock },
        { provide: AuthService, useValue: authServiceMock },
        { provide: InitialAssessmentService, useValue: initialAssessmentMock },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(StudentLayoutComponent);
    component = fixture.componentInstance;
  });

  it('creates successfully', () => {
    expect(component).toBeTruthy();
  });

  it('renders app-sidebar', () => {
    fixture.detectChanges();
    const sidebar = fixture.nativeElement.querySelector('app-sidebar');
    expect(sidebar).toBeTruthy();
  });

  it('passes all STUDENT_NAV_ITEMS to the sidebar when assessment is completed', async () => {
    await Promise.resolve();
    await Promise.resolve();
    expect(component.navItems()).toEqual(STUDENT_NAV_ITEMS);
  });

  it('hides Mi ruta and Mi progreso when the initial assessment is not completed', async () => {
    initialAssessmentMock.hasCompleted.mockResolvedValue(false);
    const f = TestBed.createComponent(StudentLayoutComponent);
    await Promise.resolve();
    await Promise.resolve();
    const routes = f.componentInstance.navItems().map((i) => i.route);
    expect(routes).not.toContain('/student/route');
    expect(routes).not.toContain('/student/progress');
    expect(routes).toContain('/student/profile');
    expect(routes).toContain('/student/dashboard');
  });

  it('renders router-outlet inside the content area', () => {
    fixture.detectChanges();
    const outlet = fixture.nativeElement.querySelector('.student-layout__content router-outlet');
    expect(outlet).toBeTruthy();
  });

  it('does not apply collapsed class when sidebar is expanded', () => {
    sidebarServiceMock.isCollapsed.mockReturnValue(false);
    fixture.detectChanges();

    const content = fixture.nativeElement.querySelector('.student-layout__content');
    expect(content.classList.contains('student-layout__content--collapsed')).toBe(false);
  });

  it('applies collapsed class when sidebar is collapsed', () => {
    sidebarServiceMock.isCollapsed.mockReturnValue(true);
    fixture.detectChanges();

    const content = fixture.nativeElement.querySelector('.student-layout__content');
    expect(content.classList.contains('student-layout__content--collapsed')).toBe(true);
  });
});