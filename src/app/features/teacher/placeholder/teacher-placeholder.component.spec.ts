import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute } from '@angular/router';
import { TeacherPlaceholderComponent } from './teacher-placeholder.component';

describe('TeacherPlaceholderComponent', () => {
  function setup(data: Record<string, unknown>): ComponentFixture<TeacherPlaceholderComponent> {
    TestBed.configureTestingModule({
      imports: [TeacherPlaceholderComponent],
      providers: [{ provide: ActivatedRoute, useValue: { snapshot: { data } } }],
    });
    const fixture = TestBed.createComponent(TeacherPlaceholderComponent);
    fixture.detectChanges();
    return fixture;
  }

  it('renders the title and subtitle from route data', () => {
    const fixture = setup({ title: 'Reportes', subtitle: 'Próximamente: métricas de desempeño.' });
    const el = fixture.nativeElement;
    expect(el.querySelector('h1')?.textContent?.trim()).toBe('Reportes');
    expect(el.querySelector('p')?.textContent).toContain('métricas');
  });

  it('falls back to defaults when route data is empty', () => {
    const fixture = setup({});
    expect(fixture.nativeElement.querySelector('h1')?.textContent?.trim()).toBe('Próximamente');
  });
});
