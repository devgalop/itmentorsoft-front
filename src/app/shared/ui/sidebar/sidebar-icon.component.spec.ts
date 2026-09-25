import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SidebarIconComponent } from './sidebar-icon.component';

describe('SidebarIconComponent', () => {
  let fixture: ComponentFixture<SidebarIconComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SidebarIconComponent],
    }).compileComponents();
    fixture = TestBed.createComponent(SidebarIconComponent);
  });

  it('creates successfully', () => {
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('renders a known icon with at least one SVG shape', () => {
    fixture.componentInstance.name = 'home';
    fixture.detectChanges();
    const shapes = fixture.nativeElement.querySelectorAll('svg path, svg polyline');
    expect(shapes.length).toBeGreaterThan(0);
  });

  it('falls back to the default icon for an unknown name', () => {
    fixture.componentInstance.name = 'no-existe';
    fixture.detectChanges();
    const circle = fixture.nativeElement.querySelector('svg circle');
    expect(circle?.getAttribute('r')).toBe('9');
  });

  it('renders a different shape per known icon name', () => {
    const names = ['home', 'users', 'shield', 'check', 'settings', 'chart', 'book', 'folder', 'route', 'search'];
    for (const name of names) {
      fixture.componentInstance.name = name;
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelector('svg')?.children.length).toBeGreaterThan(0);
    }
  });
});
