import { ComponentFixture, TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { GuideStep } from '@core/guide/guide.types';
import { GuideDialogComponent } from './guide-dialog.component';
import { SidebarService } from '../sidebar/sidebar.service';

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

  describe('resaltar una opción del menú', () => {
    const TARGET_STEPS: GuideStep[] = [
      { icon: 'home', title: 'Bienvenida', text: 'Sin opción' },
      { icon: 'route', title: 'Ruta', text: 'Con opción', target: '/student/route' },
      { icon: 'chart', title: 'Progreso', text: 'Con otra opción', target: '/student/progress' },
      { icon: 'search', title: 'Cierre', text: 'Sin opción otra vez' },
    ];
    let sidebar: SidebarService;
    let nav: HTMLElement[];
    const originalWidth = window.innerWidth;

    const rectOf = (left: number, top: number, width: number, height: number): DOMRect =>
      ({ left, top, width, height, right: left + width, bottom: top + height, x: left, y: top, toJSON: () => ({}) }) as DOMRect;

    /** Un enlace del menú como los del sidebar, con la posición que se le diga (jsdom no calcula diseño). */
    function addNavItem(route: string, rect: DOMRect): HTMLElement {
      const a = document.createElement('a');
      a.className = 'sidebar__nav-item';
      a.setAttribute('href', route);
      vi.spyOn(a, 'getBoundingClientRect').mockReturnValue(rect);
      document.body.appendChild(a);
      nav.push(a);
      return a;
    }

    const settle = () => {
      vi.advanceTimersByTime(400);
      fixture.detectChanges();
    };
    const spot = () => q('.guide__spot');
    const card = () => q('.guide')!;

    beforeEach(() => {
      vi.useFakeTimers();
      nav = [];
      sidebar = TestBed.inject(SidebarService);
      sidebar.setCollapsed(true);
      Object.defineProperty(window, 'innerWidth', { value: 1280, configurable: true });
      Object.defineProperty(window, 'innerHeight', { value: 800, configurable: true });
    });

    afterEach(() => {
      fixture?.destroy();
      nav.forEach((a) => a.remove());
      vi.useRealTimers();
      Object.defineProperty(window, 'innerWidth', { value: originalWidth, configurable: true });
    });

    it('does not highlight anything on a step without an option', () => {
      create(TARGET_STEPS);
      settle();
      expect(spot()).toBeNull();
      expect(card().classList.contains('guide--anchored')).toBe(false);
    });

    it('highlights the option of the step and puts the card next to it', () => {
      addNavItem('/student/route', rectOf(10, 200, 200, 40));
      create(TARGET_STEPS);
      click('Siguiente');
      settle();

      expect(q('.guide__title')!.textContent).toContain('Ruta');
      expect(spot()).toBeTruthy();
      expect(spot()!.style.left).toBe('4px');
      expect(spot()!.style.top).toBe('194px');
      expect(spot()!.style.width).toBe('212px');
      expect(spot()!.style.height).toBe('52px');
      expect(card().classList.contains('guide--anchored')).toBe(true);
      // A la derecha de la opción: borde derecho (210) + margen (6) + separación (16).
      expect(card().style.left).toBe('232px');
    });

    it('moves the highlight to the option of the next step', () => {
      addNavItem('/student/route', rectOf(10, 200, 200, 40));
      addNavItem('/student/progress', rectOf(10, 300, 200, 40));
      create(TARGET_STEPS);
      click('Siguiente');
      settle();
      click('Siguiente');
      settle();

      expect(q('.guide__title')!.textContent).toContain('Progreso');
      expect(spot()!.style.top).toBe('294px');
    });

    it('shows the step centered, without highlight, when its option is not in the menu', () => {
      // No hay opción "/student/route" (p. ej. Mi ruta antes de la primera evaluación).
      create(TARGET_STEPS);
      click('Siguiente');
      settle();

      expect(q('.guide__title')!.textContent).toContain('Ruta');
      expect(spot()).toBeNull();
      expect(card().classList.contains('guide--anchored')).toBe(false);
    });

    it('ignores an option that exists but is not visible', () => {
      addNavItem('/student/route', rectOf(0, 0, 0, 0));
      create(TARGET_STEPS);
      click('Siguiente');
      settle();
      expect(spot()).toBeNull();
    });

    it('keeps the card inside the screen when the option is near the bottom', () => {
      addNavItem('/student/route', rectOf(10, 780, 200, 40));
      create(TARGET_STEPS);
      click('Siguiente');
      settle();

      const top = parseFloat(card().style.top);
      expect(top).toBeGreaterThanOrEqual(16);
      expect(top).toBeLessThanOrEqual(800 - 16);
    });

    describe('en teléfono', () => {
      beforeEach(() => {
        Object.defineProperty(window, 'innerWidth', { value: 360, configurable: true });
      });

      it('puts the card at the bottom when the option is in the upper half', () => {
        addNavItem('/student/route', rectOf(10, 100, 200, 40));
        create(TARGET_STEPS);
        click('Siguiente');
        settle();

        expect(card().classList.contains('guide--mobile')).toBe(true);
        expect(card().style.bottom).toBe('16px');
        expect(card().style.top).toBe('');
      });

      it('measures the real height of the card: it goes where it fits without covering the option', () => {
        // Una tarjeta alta (400 px) y una opción a media pantalla: abajo no cabe, arriba sí.
        addNavItem('/student/route', rectOf(10, 400, 200, 40));
        create(TARGET_STEPS);
        Object.defineProperty(card(), 'scrollHeight', { value: 400, configurable: true });
        click('Siguiente');
        Object.defineProperty(card(), 'scrollHeight', { value: 400, configurable: true });
        settle();

        // below = 800 - 446 - 24 = 330 (< 400); above = 394 - 24 = 370 (< 400): no cabe en ninguno.
        expect(card().style.maxHeight).not.toBe('');
      });

      it('shrinks the card to the larger free space, which then scrolls, on a short screen', () => {
        Object.defineProperty(window, 'innerHeight', { value: 540, configurable: true });
        addNavItem('/student/route', rectOf(10, 240, 200, 40));
        create(TARGET_STEPS);
        click('Siguiente');
        Object.defineProperty(card(), 'scrollHeight', { value: 300, configurable: true });
        settle();

        // below = 540 - 286 - 24 = 230; above = 234 - 24 = 210: no cabe una de 300; va abajo, en 230.
        expect(card().style.bottom).toBe('16px');
        expect(card().style.maxHeight).toBe('230px');
      });

      it('does not limit the height when the card fits', () => {
        addNavItem('/student/route', rectOf(10, 100, 200, 40));
        create(TARGET_STEPS);
        click('Siguiente');
        settle();
        expect(card().style.maxHeight).toBe('');
      });

      it('puts the card at the top when the option is in the lower half, so it does not cover it', () => {
        addNavItem('/student/route', rectOf(10, 600, 200, 40));
        create(TARGET_STEPS);
        click('Siguiente');
        settle();

        expect(card().style.top).toBe('16px');
        expect(card().style.bottom).toBe('');
      });
    });

    describe('el menú', () => {
      it('is opened for a step with an option and left as it was when the guide closes', () => {
        addNavItem('/student/route', rectOf(10, 200, 200, 40));
        create(TARGET_STEPS);
        expect(sidebar.isCollapsed()).toBe(true);

        click('Siguiente');
        expect(sidebar.isCollapsed()).toBe(false);

        fixture.destroy();
        expect(sidebar.isCollapsed()).toBe(true);
      });

      it('goes back to collapsed on a step without an option', () => {
        addNavItem('/student/route', rectOf(10, 200, 200, 40));
        addNavItem('/student/progress', rectOf(10, 300, 200, 40));
        create(TARGET_STEPS);
        click('Siguiente');
        click('Siguiente');
        expect(sidebar.isCollapsed()).toBe(false);

        click('Siguiente');
        expect(q('.guide__title')!.textContent).toContain('Cierre');
        expect(sidebar.isCollapsed()).toBe(true);
      });

      it('does not touch a menu that the person already had open', () => {
        sidebar.setCollapsed(false);
        addNavItem('/student/route', rectOf(10, 200, 200, 40));
        create(TARGET_STEPS);
        click('Siguiente');
        expect(sidebar.isCollapsed()).toBe(false);

        click('Siguiente');
        click('Siguiente');
        expect(sidebar.isCollapsed()).toBe(false);

        fixture.destroy();
        expect(sidebar.isCollapsed()).toBe(false);
      });

      it('does not open the menu when no step has an option', () => {
        create(STEPS);
        click('Siguiente');
        expect(sidebar.isCollapsed()).toBe(true);
      });
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
