import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute } from '@angular/router';
import { StudentPlaceholderComponent } from './student-placeholder.component';

describe('StudentPlaceholderComponent', () => {
  function setup(data: Record<string, unknown>): ComponentFixture<StudentPlaceholderComponent> {
    TestBed.configureTestingModule({
      imports: [StudentPlaceholderComponent],
      providers: [{ provide: ActivatedRoute, useValue: { snapshot: { data } } }],
    });
    const fixture = TestBed.createComponent(StudentPlaceholderComponent);
    fixture.detectChanges();
    return fixture;
  }

  it('renders the title and subtitle from route data', () => {
    const fixture = setup({ title: 'Mi ruta', subtitle: 'Próximamente: tu ruta personalizada.' });
    const el = fixture.nativeElement;
    expect(el.querySelector('h1')?.textContent?.trim()).toBe('Mi ruta');
    expect(el.querySelector('p')?.textContent).toContain('ruta');
  });

  it('falls back to defaults when route data is empty', () => {
    const fixture = setup({});
    expect(fixture.nativeElement.querySelector('h1')?.textContent?.trim()).toBe('Próximamente');
  });
});
