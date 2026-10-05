import { TestBed } from '@angular/core/testing';
import { FormFieldComponent } from './form-field.component';

describe('FormFieldComponent', () => {
  function render(inputs: Partial<{ label: string; forId: string; error: string | null }> = {}) {
    const fixture = TestBed.createComponent(FormFieldComponent);
    for (const [key, value] of Object.entries(inputs)) {
      fixture.componentRef.setInput(key, value);
    }
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  }

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [FormFieldComponent] });
  });

  it('renders neither label nor error by default', () => {
    const el = render();
    expect(el.querySelector('label')).toBeNull();
    expect(el.querySelector('[role="alert"]')).toBeNull();
  });

  it('renders the label bound to the given control id', () => {
    const el = render({ label: 'Correo', forId: 'email' });
    const label = el.querySelector('label')!;
    expect(label.textContent?.trim()).toBe('Correo');
    expect(label.getAttribute('for')).toBe('email');
  });

  it('renders the error as an alert', () => {
    const el = render({ error: 'El correo es requerido' });
    const alert = el.querySelector('[role="alert"]')!;
    expect(alert.textContent?.trim()).toBe('El correo es requerido');
  });

  it('hides the error when it is null', () => {
    const el = render({ error: null });
    expect(el.querySelector('[role="alert"]')).toBeNull();
  });
});
