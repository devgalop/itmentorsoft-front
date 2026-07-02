import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { vi } from 'vitest';
import { SidebarComponent } from './sidebar.component';
import { SidebarService } from './sidebar.service';
import { AuthService } from '../../../core/auth/auth.service';
import { NavItem } from './nav-item.model';

describe('SidebarComponent', () => {
  let component: SidebarComponent;
  let fixture: ComponentFixture<SidebarComponent>;
  let authServiceMock: { logout: ReturnType<typeof vi.fn> };
  let sidebarServiceMock: { isCollapsed: ReturnType<typeof vi.fn>; toggle: ReturnType<typeof vi.fn> };

  const mockNavItems: NavItem[] = [
    { label: 'Dashboard', route: '/student/dashboard', icon: 'home' },
    { label: 'Mi ruta', route: '/student/route', icon: 'route' },
  ];

  beforeEach(async () => {
    authServiceMock = { logout: vi.fn() };
    sidebarServiceMock = {
      isCollapsed: vi.fn(() => false),
      toggle: vi.fn(),
    };

    await TestBed.configureTestingModule({
      imports: [SidebarComponent],
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: authServiceMock },
        { provide: SidebarService, useValue: sidebarServiceMock },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(SidebarComponent);
    component = fixture.componentInstance;
  });

  it('creates successfully', () => {
    expect(component).toBeTruthy();
  });

  it('renders one nav item link per entry in navItems', () => {
    fixture.componentRef.setInput('navItems', mockNavItems);
    fixture.detectChanges();

    const links = fixture.nativeElement.querySelectorAll('.sidebar__nav-item');
    expect(links.length).toBe(2);
  });

  it('renders the correct label for each nav item', () => {
    fixture.componentRef.setInput('navItems', mockNavItems);
    fixture.detectChanges();

    const labels = Array.from(
      fixture.nativeElement.querySelectorAll('.sidebar__nav-label'),
    ).map((el) => (el as HTMLElement).textContent?.trim());

    expect(labels).toEqual(['Dashboard', 'Mi ruta']);
  });

  it('renders empty nav when navItems is empty', () => {
    fixture.componentRef.setInput('navItems', []);
    fixture.detectChanges();

    const links = fixture.nativeElement.querySelectorAll('.sidebar__nav-item');
    expect(links.length).toBe(0);
  });

  it('shows roleLabel when provided and sidebar is expanded', () => {
    fixture.componentRef.setInput('roleLabel', 'Estudiante');
    fixture.detectChanges();

    const roleEl = fixture.nativeElement.querySelector('.sidebar__role strong');
    expect(roleEl?.textContent?.trim()).toBe('Estudiante');
  });

  it('does not show roleLabel block when roleLabel is empty', () => {
    fixture.componentRef.setInput('roleLabel', '');
    fixture.detectChanges();

    const roleEl = fixture.nativeElement.querySelector('.sidebar__role');
    expect(roleEl).toBeNull();
  });

  it('does not show nav labels when sidebar is collapsed', () => {
    sidebarServiceMock.isCollapsed.mockReturnValue(true);
    fixture.componentRef.setInput('navItems', mockNavItems);
    fixture.detectChanges();

    const labels = fixture.nativeElement.querySelectorAll('.sidebar__nav-label');
    expect(labels.length).toBe(0);
  });

  it('applies sidebar--collapsed class when isCollapsed is true', () => {
    sidebarServiceMock.isCollapsed.mockReturnValue(true);
    fixture.detectChanges();

    const aside = fixture.nativeElement.querySelector('aside');
    expect(aside.classList.contains('sidebar--collapsed')).toBe(true);
  });

  it('calls sidebarService.toggle() when toggle button is clicked', () => {
    fixture.detectChanges();

    const toggleButton = fixture.nativeElement.querySelector('.sidebar__toggle');
    toggleButton.click();

    expect(sidebarServiceMock.toggle).toHaveBeenCalledTimes(1);
  });

  it('calls authService.logout() when logout button is clicked', () => {
    fixture.detectChanges();

    const logoutButton = fixture.nativeElement.querySelector('app-button button');
    logoutButton.click();

    expect(authServiceMock.logout).toHaveBeenCalledTimes(1);
  });
});