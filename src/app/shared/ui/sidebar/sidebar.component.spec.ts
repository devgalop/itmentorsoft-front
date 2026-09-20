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
  let authServiceMock: { logout: ReturnType<typeof vi.fn>; user: ReturnType<typeof vi.fn> };
  let sidebarServiceMock: { isCollapsed: ReturnType<typeof vi.fn>; toggle: ReturnType<typeof vi.fn> };

  const mockNavItems: NavItem[] = [
    { label: 'Dashboard', route: '/student/dashboard', icon: 'home' },
    { label: 'Mi ruta', route: '/student/route', icon: 'route' },
  ];

  const groupedNavItems: NavItem[] = [
    { label: 'Dashboard', route: '/teacher/dashboard', icon: 'home', group: 'Principal' },
    { label: 'Reportes', route: '/teacher/reports', icon: 'chart', group: 'Principal' },
    { label: 'Cuestionarios', route: '/teacher/questions', icon: 'book', group: 'Contenido' },
  ];

  beforeEach(async () => {
    authServiceMock = { logout: vi.fn(), user: vi.fn(() => ({ userName: 'ana_perez', role: 'student' })) };
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

  it('does not render group titles when items have no group', () => {
    fixture.componentRef.setInput('navItems', mockNavItems);
    fixture.detectChanges();

    const titles = fixture.nativeElement.querySelectorAll('.sidebar__group-title');
    expect(titles.length).toBe(0);
  });

  it('renders one group title per distinct group, preserving order', () => {
    fixture.componentRef.setInput('navItems', groupedNavItems);
    fixture.detectChanges();

    const titles = Array.from(
      fixture.nativeElement.querySelectorAll('.sidebar__group-title'),
    ).map((el) => (el as HTMLElement).textContent?.trim());

    expect(titles).toEqual(['Principal', 'Contenido']);
    const links = fixture.nativeElement.querySelectorAll('.sidebar__nav-item');
    expect(links.length).toBe(3);
  });

  it('shows roleLabel next to the avatar when profileRoute is provided and sidebar is expanded', () => {
    fixture.componentRef.setInput('roleLabel', 'Estudiante');
    fixture.componentRef.setInput('profileRoute', '/student/profile');
    fixture.detectChanges();

    const roleEl = fixture.nativeElement.querySelector('.sidebar__profile-text strong');
    expect(roleEl?.textContent?.trim()).toBe('Estudiante');
  });

  it('does not show the profile block when profileRoute is empty', () => {
    fixture.componentRef.setInput('roleLabel', 'Estudiante');
    fixture.componentRef.setInput('profileRoute', '');
    fixture.detectChanges();

    const profileEl = fixture.nativeElement.querySelector('.sidebar__profile');
    expect(profileEl).toBeNull();
  });

  it('shows the user initials in the avatar, computed from the username', () => {
    fixture.componentRef.setInput('profileRoute', '/student/profile');
    fixture.detectChanges();

    const avatar = fixture.nativeElement.querySelector('.sidebar__avatar');
    expect(avatar?.textContent?.trim()).toBe('AP');
  });

  it('keeps the avatar visible but hides the role text when collapsed', () => {
    sidebarServiceMock.isCollapsed.mockReturnValue(true);
    fixture.componentRef.setInput('roleLabel', 'Estudiante');
    fixture.componentRef.setInput('profileRoute', '/student/profile');
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.sidebar__avatar')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('.sidebar__profile-text')).toBeNull();
  });

  it('sets a title attribute with the label on each nav item, for hover tooltips', () => {
    fixture.componentRef.setInput('navItems', mockNavItems);
    fixture.detectChanges();

    const links = fixture.nativeElement.querySelectorAll('.sidebar__nav-item');
    expect(Array.from(links).map((l) => (l as HTMLElement).title)).toEqual(['Dashboard', 'Mi ruta']);
  });

  it('renders an icon for each nav item', () => {
    fixture.componentRef.setInput('navItems', mockNavItems);
    fixture.detectChanges();

    const icons = fixture.nativeElement.querySelectorAll('.sidebar__nav-icon app-sidebar-icon');
    expect(icons).toHaveLength(mockNavItems.length);
  });

  it('shows the logout button at the bottom, with its icon, even when collapsed', () => {
    sidebarServiceMock.isCollapsed.mockReturnValue(true);
    fixture.detectChanges();

    const footer = fixture.nativeElement.querySelector('.sidebar__footer');
    expect(footer).toBeTruthy();
    expect(footer.querySelector('app-sidebar-icon')).toBeTruthy();
  });

  it('hides the logout label but keeps the icon when collapsed', () => {
    sidebarServiceMock.isCollapsed.mockReturnValue(true);
    fixture.detectChanges();

    const footer = fixture.nativeElement.querySelector('.sidebar__footer');
    expect(footer.textContent?.trim()).toBe('');
    expect(footer.querySelector('app-sidebar-icon')).toBeTruthy();
  });

  it('does not show nav labels when sidebar is collapsed', () => {
    sidebarServiceMock.isCollapsed.mockReturnValue(true);
    fixture.componentRef.setInput('navItems', mockNavItems);
    fixture.detectChanges();

    const labels = fixture.nativeElement.querySelectorAll('.sidebar__nav-label');
    expect(labels.length).toBe(0);
  });

  it('does not show group titles when sidebar is collapsed', () => {
    sidebarServiceMock.isCollapsed.mockReturnValue(true);
    fixture.componentRef.setInput('navItems', groupedNavItems);
    fixture.detectChanges();

    const titles = fixture.nativeElement.querySelectorAll('.sidebar__group-title');
    expect(titles.length).toBe(0);
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

  it('calls sidebarService.toggle() when the mobile trigger is clicked', () => {
    sidebarServiceMock.isCollapsed.mockReturnValue(true);
    fixture.detectChanges();

    const mobileTrigger = fixture.nativeElement.querySelector('.sidebar__mobile-trigger');
    mobileTrigger.click();

    expect(sidebarServiceMock.toggle).toHaveBeenCalledTimes(1);
  });

  it('hides the mobile trigger once the drawer is open, since the backdrop already closes it', () => {
    sidebarServiceMock.isCollapsed.mockReturnValue(false);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.sidebar__mobile-trigger')).toBeNull();
  });

  it('does not show the backdrop when collapsed', () => {
    sidebarServiceMock.isCollapsed.mockReturnValue(true);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.sidebar__backdrop')).toBeNull();
  });

  it('shows the backdrop when the drawer is open (not collapsed)', () => {
    sidebarServiceMock.isCollapsed.mockReturnValue(false);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.sidebar__backdrop')).toBeTruthy();
  });

  it('closes the drawer when the backdrop is clicked', () => {
    sidebarServiceMock.isCollapsed.mockReturnValue(false);
    fixture.detectChanges();

    fixture.nativeElement.querySelector('.sidebar__backdrop').click();

    expect(sidebarServiceMock.toggle).toHaveBeenCalledTimes(1);
  });

  it('calls authService.logout() when logout button is clicked', () => {
    fixture.detectChanges();

    const logoutButton = fixture.nativeElement.querySelector('app-button button');
    logoutButton.click();

    expect(authServiceMock.logout).toHaveBeenCalledTimes(1);
  });
});
