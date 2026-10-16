import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactiveFormsModule, FormControl } from '@angular/forms';
import { By } from '@angular/platform-browser';
import { InputComponent } from './input.component';

describe('InputComponent', () => {
  let fixture: ComponentFixture<InputComponent>;
  let control: FormControl<string | null>;

  function createComponent(inputs: {
    id: string;
    type?: string;
    placeholder?: string;
    control: FormControl<string | null>;
    error?: string | null;
  }) {
    fixture = TestBed.createComponent(InputComponent);
    const componentRef = fixture.componentRef;
    componentRef.setInput('id', inputs.id);
    componentRef.setInput('type', inputs.type ?? 'text');
    componentRef.setInput('placeholder', inputs.placeholder ?? '');
    componentRef.setInput('control', inputs.control);
    if (inputs.error !== undefined) {
      componentRef.setInput('error', inputs.error);
    }
    fixture.detectChanges();
    return fixture.componentInstance;
  }

  beforeEach(async () => {
    control = new FormControl('');
    await TestBed.configureTestingModule({
      imports: [ReactiveFormsModule, InputComponent],
    }).compileComponents();
  });

  it('renders input element', () => {
    const component = createComponent({ id: 'test-input', control });
    const input = fixture.debugElement.query(By.css('input'));
    expect(input).toBeTruthy();
  });

  it('renders with correct id', () => {
    createComponent({ id: 'test-input', control });
    const input = fixture.debugElement.query(By.css('input'));
    expect(input.nativeElement.id).toBe('test-input');
  });

  it('renders with correct placeholder', () => {
    createComponent({ id: 'test-input', placeholder: 'Enter value', control });
    const input = fixture.debugElement.query(By.css('input'));
    expect(input.nativeElement.placeholder).toBe('Enter value');
  });

  it('shows error when provided', () => {
    createComponent({ id: 'test-input', control, error: 'This field is required' });
    const errorEl = fixture.debugElement.query(By.css('.app-input__error'));
    expect(errorEl).toBeTruthy();
    expect(errorEl.nativeElement.textContent.trim()).toBe('This field is required');
  });

  it('does not show error when not provided', () => {
    createComponent({ id: 'test-input', control });
    const errorEl = fixture.debugElement.query(By.css('.app-input__error'));
    expect(errorEl).toBeFalsy();
  });

  it('sets aria-invalid when error is present', () => {
    createComponent({ id: 'test-input', control, error: 'Invalid value' });
    const input = fixture.debugElement.query(By.css('input'));
    expect(input.nativeElement.getAttribute('aria-invalid')).toBe('true');
  });

  describe('password toggle', () => {
    const toggle = () => fixture.debugElement.query(By.css('.app-input__toggle'));
    const field = () => fixture.debugElement.query(By.css('input')).nativeElement as HTMLInputElement;

    it('does not show the toggle for fields that are not passwords', () => {
      createComponent({ id: 'email', type: 'email', control });
      expect(toggle()).toBeFalsy();
    });

    it('hides the password by default and offers to show it', () => {
      createComponent({ id: 'pwd', type: 'password', control });
      expect(field().type).toBe('password');
      expect(toggle().nativeElement.getAttribute('aria-label')).toBe('Mostrar contraseña');
      expect(toggle().nativeElement.getAttribute('aria-pressed')).toBe('false');
    });

    it('shows the text when the toggle is pressed and hides it again on a second press', () => {
      createComponent({ id: 'pwd', type: 'password', control });

      toggle().nativeElement.click();
      fixture.detectChanges();
      expect(field().type).toBe('text');
      expect(toggle().nativeElement.getAttribute('aria-label')).toBe('Ocultar contraseña');
      expect(toggle().nativeElement.getAttribute('aria-pressed')).toBe('true');

      toggle().nativeElement.click();
      fixture.detectChanges();
      expect(field().type).toBe('password');
    });

    it('does not submit the form: the toggle is a plain button', () => {
      createComponent({ id: 'pwd', type: 'password', control });
      expect(toggle().nativeElement.getAttribute('type')).toBe('button');
    });

    it('keeps the typed value when toggling', () => {
      createComponent({ id: 'pwd', type: 'password', control });
      control.setValue('secreto1!');
      toggle().nativeElement.click();
      fixture.detectChanges();
      expect(field().value).toBe('secreto1!');
    });
  });
});
