import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { vi } from 'vitest';
import { TeacherLayoutComponent } from './teacher-layout.component';
import { SidebarService } from '../../../shared/ui/sidebar/sidebar.service';
import { AuthService } from '../../../core/auth/auth.service';
import { TEACHER_NAV_ITEMS } from './teacher-nav-items';
import { GuideService } from '../../../core/guide/guide.service';

describe('TeacherLayoutComponent', () => {
  let component: TeacherLayoutComponent;
  let fixture: ComponentFixture<TeacherLayoutComponent>;
  let sidebarServiceMock: { isCollapsed: ReturnType<typeof vi.fn> };
  let authServiceMock: {
    logout: ReturnType<typeof vi.fn>;
    user: ReturnType<typeof vi.fn>;
    userId: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    localStorage.clear();
    sidebarServiceMock = { isCollapsed: vi.fn(() => false) };
    authServiceMock = { logout: vi.fn(), user: vi.fn(() => null), userId: vi.fn(() => 't1') };

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

  describe('guía de uso', () => {
    const dialog = () => fixture.nativeElement.querySelector('app-guide-dialog') as HTMLElement | null;
    const guideButton = () => fixture.nativeElement.querySelector('button.sidebar__nav-item--button') as HTMLButtonElement;

    // El layout de arriba ya abrió la guía en el servicio compartido: cada prueba parte de cero.
    beforeEach(() => {
      fixture.destroy();
      TestBed.inject(GuideService).close();
      localStorage.clear();
    });

    afterEach(() => {
      fixture.destroy();
      localStorage.clear();
    });

    it('opens by itself the first time, with the teacher guide', () => {
      fixture = TestBed.createComponent(TeacherLayoutComponent);
      fixture.detectChanges();
      expect(dialog()).toBeTruthy();
      expect(fixture.nativeElement.querySelector('.guide__counter').textContent).toContain('de 5');
    });

    it('does not open again once it was seen, but the menu button opens it on demand', () => {
      localStorage.setItem('itm.guide.seen.teacher.t1', '1');
      fixture = TestBed.createComponent(TeacherLayoutComponent);
      fixture.detectChanges();
      expect(dialog()).toBeNull();

      guideButton().click();
      fixture.detectChanges();

      expect(dialog()).toBeTruthy();
    });

    it('does not open without a logged-in user', () => {
      authServiceMock.userId.mockReturnValue(null);
      fixture = TestBed.createComponent(TeacherLayoutComponent);
      fixture.detectChanges();
      expect(dialog()).toBeNull();
    });
  });
});
