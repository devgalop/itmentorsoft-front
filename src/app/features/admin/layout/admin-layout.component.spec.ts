import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { vi } from 'vitest';
import { AdminLayoutComponent } from './admin-layout.component';
import { SidebarService } from '../../../shared/ui/sidebar/sidebar.service';
import { AuthService } from '../../../core/auth/auth.service';
import { ADMIN_NAV_ITEMS } from './admin-nav-items';

describe('AdminLayoutComponent', () => {
  let component: AdminLayoutComponent;
  let fixture: ComponentFixture<AdminLayoutComponent>;
  let sidebarServiceMock: { isCollapsed: ReturnType<typeof vi.fn> };
  let authServiceMock: { logout: ReturnType<typeof vi.fn> };

  beforeEach(async () => {
    sidebarServiceMock = { isCollapsed: vi.fn(() => false) };
    authServiceMock = { logout: vi.fn() };

    await TestBed.configureTestingModule({
      imports: [AdminLayoutComponent],
      providers: [
        provideRouter([]),
        { provide: SidebarService, useValue: sidebarServiceMock },
        { provide: AuthService, useValue: authServiceMock },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(AdminLayoutComponent);
    component = fixture.componentInstance;
  });

  it('creates successfully', () => {
    expect(component).toBeTruthy();
  });

  it('renders app-sidebar', () => {
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('app-sidebar')).toBeTruthy();
  });

  it('passes ADMIN_NAV_ITEMS to the sidebar', () => {
    expect(component.navItems).toBe(ADMIN_NAV_ITEMS);
  });

  it('applies collapsed class when sidebar is collapsed', () => {
    sidebarServiceMock.isCollapsed.mockReturnValue(true);
    fixture.detectChanges();
    const content = fixture.nativeElement.querySelector('.admin-layout__content');
    expect(content.classList.contains('admin-layout__content--collapsed')).toBe(true);
  });
});
