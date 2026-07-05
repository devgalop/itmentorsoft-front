import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute } from '@angular/router';
import { AdminPlaceholderComponent } from './admin-placeholder.component';

describe('AdminPlaceholderComponent', () => {
  function setup(data: Record<string, unknown>): ComponentFixture<AdminPlaceholderComponent> {
    TestBed.configureTestingModule({
      imports: [AdminPlaceholderComponent],
      providers: [{ provide: ActivatedRoute, useValue: { snapshot: { data } } }],
    });
    const fixture = TestBed.createComponent(AdminPlaceholderComponent);
    fixture.detectChanges();
    return fixture;
  }

  it('renders the title and subtitle from route data', () => {
    const fixture = setup({ title: 'Usuarios', subtitle: 'Próximamente: gestión de usuarios.' });
    const el = fixture.nativeElement;
    expect(el.querySelector('h1')?.textContent?.trim()).toBe('Usuarios');
    expect(el.querySelector('p')?.textContent).toContain('usuarios');
  });

  it('falls back to defaults when route data is empty', () => {
    const fixture = setup({});
    expect(fixture.nativeElement.querySelector('h1')?.textContent?.trim()).toBe('Próximamente');
  });
});
