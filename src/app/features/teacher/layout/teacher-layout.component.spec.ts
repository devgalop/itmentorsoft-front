import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { vi } from 'vitest';
import { TeacherLayoutComponent } from './teacher-layout.component';
import { SidebarService } from '../../../shared/ui/sidebar/sidebar.service';
import { AuthService } from '../../../core/auth/auth.service';
import { TEACHER_NAV_ITEMS } from './teacher-nav-items';

describe('TeacherLayoutComponent', () => {
  let component: TeacherLayoutComponent;
  let fixture: ComponentFixture<TeacherLayoutComponent>;
  let sidebarServiceMock: { isCollapsed: ReturnType<typeof vi.fn> };
  let authServiceMock: { logout: ReturnType<typeof vi.fn> };

  beforeEach(async () => {
    sidebarServiceMock = { isCollapsed: vi.fn(() => false) };
    authServiceMock = { logout: vi.fn() };

    await TestBed.configureTestingModule({
      imports: [TeacherLayoutComponent],
      providers: [
        provideRouter([]),
        { provide: SidebarService, useValue: sidebarServiceMock },
        { provide: AuthService, useValue: authServiceMock },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(TeacherLayoutComponent);
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

  it('passes TEACHER_NAV_ITEMS to the sidebar', () => {
    expect(component.navItems).toBe(TEACHER_NAV_ITEMS);
  });

  it('renders router-outlet inside the content area', () => {
    fixture.detectChanges();
    const outlet = fixture.nativeElement.querySelector('.teacher-layout__content router-outlet');
    expect(outlet).toBeTruthy();
  });

  it('does not apply collapsed class when sidebar is expanded', () => {
    sidebarServiceMock.isCollapsed.mockReturnValue(false);
    fixture.detectChanges();

    const content = fixture.nativeElement.querySelector('.teacher-layout__content');
    expect(content.classList.contains('teacher-layout__content--collapsed')).toBe(false);
  });

  it('applies collapsed class when sidebar is collapsed', () => {
    sidebarServiceMock.isCollapsed.mockReturnValue(true);
    fixture.detectChanges();

    const content = fixture.nativeElement.querySelector('.teacher-layout__content');
    expect(content.classList.contains('teacher-layout__content--collapsed')).toBe(true);
  });
});
