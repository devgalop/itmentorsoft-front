import { ComponentFixture, TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { GuideStep } from '@core/guide/guide.types';
import { GuideDialogComponent } from './guide-dialog.component';

const STEPS: GuideStep[] = [
  { icon: 'home', title: 'Uno', text: 'Texto uno' },
  { icon: 'route', title: 'Dos', text: 'Texto dos' },
  { icon: 'chart', title: 'Tres', text: 'Texto tres' },
];

describe('GuideDialogComponent', () => {
  let fixture: ComponentFixture<GuideDialogComponent>;
  let closed: ReturnType<typeof vi.fn>;

  const el = () => fixture.nativeElement as HTMLElement;
  const q = (selector: string) => el().querySelector(selector) as HTMLElement | null;
  const buttons = () => Array.from(el().querySelectorAll('button')).map((b) => b.textContent!.trim());
  const click = (label: string) => {
    Array.from(el().querySelectorAll('button')).find((b) => b.textContent!.trim() === label)!.click();
    fixture.detectChanges();
  };
  const press = (key: string, init: KeyboardEventInit = {}) => {
    const event = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true, ...init });
    document.dispatchEvent(event);
    fixture.detectChanges();
    return event;
  };

  function create(steps: GuideStep[] = STEPS): void {
    fixture = TestBed.createComponent(GuideDialogComponent);
    fixture.componentRef.setInput('steps', steps);
    closed = vi.fn();
    fixture.componentInstance.closed.subscribe(closed);
    fixture.detectChanges();
  }

  beforeEach(() => {
    document.body.style.overflow = '';
    TestBed.configureTestingModule({});
  });

  afterEach(() => {
    fixture?.destroy();
    document.body.style.overflow = '';
  });

  it('shows the first step with its title, text and counter', () => {
    create();
    expect(q('.guide__title')!.textContent).toContain('Uno');
    expect(q('.guide__text')!.textContent).toContain('Texto uno');
    expect(q('.guide__counter')!.textContent).toContain('Paso 1 de 3');
  });

  it('is a modal dialog labelled by its title and text', () => {
    create();
    const dialog = q('[role="dialog"]')!;
    expect(dialog.getAttribute('aria-modal')).toBe('true');
    expect(dialog.getAttribute('aria-labelledby')).toBe('guide-title');
    expect(dialog.getAttribute('aria-describedby')).toBe('guide-text');
    expect(q('#guide-title')).toBeTruthy();
    expect(q('#guide-text')).toBeTruthy();
  });

  it('draws one dot per step and marks the current one', () => {
    create();
    const dots = el().querySelectorAll('.guide__dot');
    expect(dots.length).toBe(3);
    expect(dots[0]!.getAttribute('aria-current')).toBe('step');
    expect(dots[1]!.getAttribute('aria-current')).toBeNull();
  });

  it('on the first step: no "Anterior", and "Omitir" and "Siguiente" are shown', () => {
    create();
    expect(buttons()).toEqual(['Omitir', 'Siguiente']);
  });

  it('goes forward and back', () => {
    create();
    click('Siguiente');
    expect(q('.guide__title')!.textContent).toContain('Dos');
    expect(q('.guide__counter')!.textContent).toContain('Paso 2 de 3');
    expect(buttons()).toEqual(['Omitir', 'Anterior', 'Siguiente']);

    click('Anterior');
    expect(q('.guide__title')!.textContent).toContain('Uno');
  });

  it('on the last step: "Entendido" replaces "Siguiente" and "Omitir" is gone', () => {
    create();
    click('Siguiente');
    click('Siguiente');
    expect(q('.guide__title')!.textContent).toContain('Tres');
    expect(buttons()).toEqual(['Anterior', 'Entendido']);
  });

  it('closes with "Omitir" from any step', () => {
    create();
    click('Siguiente');
    click('Omitir');
    expect(closed).toHaveBeenCalledTimes(1);
  });

  it('closes with "Entendido" on the last step', () => {
    create();
    click('Siguiente');
    click('Siguiente');
    click('Entendido');
    expect(closed).toHaveBeenCalledTimes(1);
  });

  it('works with a single step: only "Entendido"', () => {
    create([STEPS[0]!]);
    expect(buttons()).toEqual(['Entendido']);
    click('Entendido');
    expect(closed).toHaveBeenCalledTimes(1);
  });

  it('shows nothing when there are no steps', () => {
    create([]);
    expect(q('[role="dialog"]')).toBeNull();
  });

  describe('keyboard', () => {
    it('closes with Esc', () => {
      create();
      const event = press('Escape');
      expect(closed).toHaveBeenCalledTimes(1);
      expect(event.defaultPrevented).toBe(true);
    });

    it('moves with the arrow keys and does not go past either end', () => {
      create();
      press('ArrowLeft');
      expect(q('.guide__title')!.textContent).toContain('Uno');

      press('ArrowRight');
      press('ArrowRight');
      press('ArrowRight');
      expect(q('.guide__title')!.textContent).toContain('Tres');

      press('ArrowLeft');
      expect(q('.guide__title')!.textContent).toContain('Dos');
    });

    it('keeps Tab inside the dialog: from the last button it goes to the first', () => {
      create();
      const all = Array.from(el().querySelectorAll('button'));
      all[all.length - 1]!.focus();

      const event = press('Tab');

      expect(event.defaultPrevented).toBe(true);
      expect(document.activeElement).toBe(all[0]);
    });

    it('keeps Shift+Tab inside the dialog: from the first button it goes to the last', () => {
      create();
      const all = Array.from(el().querySelectorAll('button'));
      all[0]!.focus();

      const event = press('Tab', { shiftKey: true });

      expect(event.defaultPrevented).toBe(true);
      expect(document.activeElement).toBe(all[all.length - 1]);
    });

    it('lets Tab move normally between the buttons in the middle', () => {
      create();
      click('Siguiente');
      const all = Array.from(el().querySelectorAll('button'));
      all[1]!.focus();

      const event = press('Tab');

      expect(event.defaultPrevented).toBe(false);
    });
  });

  describe('page behind', () => {
    it('blocks the page scroll while open and restores it when closed', () => {
      document.body.style.overflow = 'auto';
      create();
      expect(document.body.style.overflow).toBe('hidden');

      fixture.destroy();
      expect(document.body.style.overflow).toBe('auto');
    });

    it('gives the focus back to what had it before opening', () => {
      const opener = document.createElement('button');
      document.body.appendChild(opener);
      opener.focus();

      create();
      fixture.destroy();

      expect(document.activeElement).toBe(opener);
      opener.remove();
    });
  });
});
