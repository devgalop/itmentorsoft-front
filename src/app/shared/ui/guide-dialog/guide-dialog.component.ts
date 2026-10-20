import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  afterNextRender,
  computed,
  inject,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { GuideStep } from '@core/guide/guide.types';
import { SidebarIconComponent } from '../sidebar/sidebar-icon.component';
import { SidebarService } from '../sidebar/sidebar.service';

/**
 * Ventana de bienvenida con pasos (guía de uso). Muestra un paso a la vez, con puntos de avance y
 * botones Anterior / Siguiente / Omitir; el último paso cierra con "Entendido". Se maneja con el
 * teclado (flechas para avanzar o volver, Esc para cerrar, Tab se queda dentro de la ventana),
 * bloquea el scroll de la página mientras está abierta y devuelve el foco a donde estaba al cerrarse.
 *
 * Si un paso trae `target` (una opción del menú lateral), el menú se despliega, esa opción se resalta
 * (el resto de la pantalla se oscurece) y la tarjeta se coloca junto a ella. Si la opción no existe,
 * el paso se muestra centrado, sin resaltar.
 */
@Component({
  selector: 'app-guide-dialog',
  standalone: true,
  imports: [SidebarIconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '(document:keydown)': 'onKeydown($event)', '(window:resize)': 'schedule()' },
  template: `
    @if (step(); as s) {
      <div class="guide__backdrop" [class.guide__backdrop--spot]="spot() !== null">
        @if (spot(); as sp) {
          <div
            class="guide__spot"
            aria-hidden="true"
            [style.left.px]="sp.left"
            [style.top.px]="sp.top"
            [style.width.px]="sp.width"
            [style.height.px]="sp.height"
          ></div>
        }
        <div
          #dialog
          class="guide"
          [class.guide--anchored]="anchored() !== null"
          [class.guide--mobile]="mobile()"
          [style.left.px]="anchored()?.left"
          [style.top.px]="anchored()?.top"
          [style.bottom.px]="anchored()?.bottom"
          [style.max-height.px]="anchored()?.maxHeight"
          role="dialog"
          aria-modal="true"
          aria-labelledby="guide-title"
          aria-describedby="guide-text"
          tabindex="-1"
        >
          <ol class="guide__dots" aria-label="Pasos de la guía">
            @for (_ of steps(); track $index) {
              <li
                class="guide__dot"
                [class.guide__dot--on]="$index === index()"
                [class.guide__dot--done]="$index < index()"
                [attr.aria-current]="$index === index() ? 'step' : null"
              ></li>
            }
          </ol>
          <p class="guide__counter">Paso {{ index() + 1 }} de {{ steps().length }}</p>

          <div class="guide__step" aria-live="polite">
            <span class="guide__icon" aria-hidden="true"><app-sidebar-icon [name]="s.icon" /></span>
            <h2 id="guide-title" class="guide__title">{{ s.title }}</h2>
            <p id="guide-text" class="guide__text">{{ s.text }}</p>
          </div>

          <div class="guide__actions">
            @if (!isLast()) {
              <button type="button" class="guide__skip" (click)="close()">Omitir</button>
            }
            <span class="guide__spacer"></span>
            @if (!isFirst()) {
              <button type="button" class="guide__btn guide__btn--ghost" (click)="previous()">Anterior</button>
            }
            @if (isLast()) {
              <button type="button" class="guide__btn" (click)="close()">Entendido</button>
            } @else {
              <button type="button" class="guide__btn" (click)="next()">Siguiente</button>
            }
          </div>
        </div>
      </div>
    }
  `,
  styles: `
    .guide__backdrop {
      position: fixed;
      inset: 0;
      z-index: 2000;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 1rem;
      background: rgba(13, 43, 110, 0.55);
    }

    .guide__backdrop--spot {
      background: transparent;
    }

    /* El "hueco" iluminado sobre la opción del menú: su sombra gigante oscurece todo lo demás. */
    .guide__spot {
      position: fixed;
      border-radius: 0.75rem;
      box-shadow: 0 0 0 9999px rgba(13, 43, 110, 0.6);
      outline: 2px solid var(--color-accent);
      pointer-events: none;
      transition: left 0.2s, top 0.2s, width 0.2s, height 0.2s;
    }

    .guide {
      width: 100%;
      max-width: 28rem;
      max-height: 100%;
      overflow-y: auto;
      padding: 1.5rem;
      background: var(--color-white);
      border-radius: 1.25rem;
      box-shadow: 0 20px 48px rgba(0, 0, 0, 0.3);
      animation: guide-in 0.2s ease-out;
    }

    /* Con un elemento resaltado, la tarjeta se coloca junto a él en lugar de ir centrada. */
    .guide--anchored {
      position: fixed;
      width: 28rem;
      max-width: calc(100vw - 2rem);
    }

    .guide--anchored.guide--mobile {
      left: 1rem;
      right: 1rem;
      width: auto;
      max-width: none;
    }

    .guide:focus {
      outline: none;
    }

    .guide__dots {
      list-style: none;
      display: flex;
      gap: 0.35rem;
    }

    .guide__dot {
      flex: 1;
      height: 4px;
      max-width: 2.5rem;
      border-radius: 2px;
      background: var(--color-light-1);
    }

    .guide__dot--done {
      background: var(--color-accent);
    }

    .guide__dot--on {
      background: var(--color-primary);
    }

    .guide__counter {
      margin-top: 0.6rem;
      font-size: 0.75rem;
      color: var(--color-mid-2);
    }

    .guide__step {
      min-height: 12rem;
      padding-top: 1rem;
    }

    .guide__icon {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 3.5rem;
      height: 3.5rem;
      padding: 0.9rem;
      margin-bottom: 1rem;
      border-radius: 50%;
      background: var(--color-accent-pale);
      color: var(--color-accent);
    }

    .guide__title {
      margin-bottom: 0.5rem;
      font-size: 1.25rem;
      font-weight: 800;
      line-height: 1.3;
      color: var(--color-primary);
    }

    .guide__text {
      font-size: 0.95rem;
      line-height: 1.6;
      color: var(--color-mid-1);
    }

    .guide__actions {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      margin-top: 1.25rem;
    }

    .guide__spacer {
      flex: 1;
    }

    .guide__skip {
      padding: 0.5rem 0.25rem;
      border: none;
      background: none;
      font-size: 0.85rem;
      font-weight: 600;
      color: var(--color-mid-2);
      cursor: pointer;
    }

    .guide__skip:hover {
      color: var(--color-primary);
    }

    .guide__btn {
      padding: 0.6rem 1.25rem;
      border: 1px solid var(--color-primary);
      border-radius: 0.5rem;
      background: var(--color-primary);
      font-size: 0.9rem;
      font-weight: 700;
      color: var(--color-white);
      cursor: pointer;
    }

    .guide__btn--ghost {
      background: transparent;
      color: var(--color-primary);
    }

    .guide__btn:focus-visible,
    .guide__skip:focus-visible {
      outline: 2px solid var(--color-secondary);
      outline-offset: 2px;
    }

    @keyframes guide-in {
      from {
        opacity: 0;
        transform: translateY(8px);
      }
      to {
        opacity: 1;
        transform: none;
      }
    }

    @media (prefers-reduced-motion: reduce) {
      .guide {
        animation: none;
      }

      .guide__spot {
        transition: none;
      }
    }

    @media (max-width: 480px) and (min-height: 701px) {
      .guide__step {
        min-height: 10rem;
      }
    }

    /* Pantallas bajas: la tarjeta se compacta (sin icono) para no tapar la opción resaltada. */
    @media (max-height: 700px) {
      .guide {
        padding: 1rem 1.25rem;
      }

      .guide__icon {
        display: none;
      }

      .guide__step {
        min-height: 0;
        padding-top: 0.5rem;
      }

      .guide__title {
        font-size: 1.1rem;
      }

      .guide__text {
        font-size: 0.9rem;
        line-height: 1.5;
      }

      .guide__actions {
        margin-top: 0.9rem;
      }
    }

    @media (max-width: 480px) {
      .guide {
        padding: 1.25rem;
      }

      .guide__btn {
        flex: 1;
      }

      .guide__spacer {
        display: none;
      }

      .guide__actions {
        flex-wrap: wrap-reverse;
      }

      .guide__skip {
        width: 100%;
      }
    }

    /* Teléfono bajo: Omitir comparte la fila con los otros botones para que todo quepa a la vista. */
    @media (max-width: 480px) and (max-height: 700px) {
      .guide__actions {
        flex-wrap: nowrap;
      }

      .guide__skip {
        width: auto;
      }
    }
  `,
})
export class GuideDialogComponent {
  readonly steps = input.required<GuideStep[]>();
  /** Se emite al cerrar (Omitir, Entendido o Esc). */
  readonly closed = output<void>();

  protected readonly index = signal(0);
  protected readonly step = computed(() => this.steps()[this.index()]);
  protected readonly isFirst = computed(() => this.index() === 0);
  protected readonly isLast = computed(() => this.index() >= this.steps().length - 1);

  /** Hueco iluminado sobre la opción del menú que explica el paso (null si no hay). */
  protected readonly spot = signal<{ left: number; top: number; width: number; height: number } | null>(null);
  /** Posición de la tarjeta cuando va junto al elemento resaltado (null = centrada). */
  protected readonly anchored = signal<{ left?: number; top?: number; bottom?: number; maxHeight?: number } | null>(null);
  protected readonly mobile = signal(false);

  private readonly dialog = viewChild<ElementRef<HTMLElement>>('dialog');
  private readonly sidebar = inject(SidebarService);
  private menuOpenedByGuide = false;
  private timers: ReturnType<typeof setTimeout>[] = [];

  constructor() {
    const previousFocus = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    // Mientras está abierta, la página de atrás no se desplaza.
    document.body.style.overflow = 'hidden';
    afterNextRender(() => {
      this.dialog()?.nativeElement.focus();
      this.schedule();
    });

    inject(DestroyRef).onDestroy(() => {
      this.clearTimers();
      // Si la guía desplegó el menú, lo deja como estaba.
      if (this.menuOpenedByGuide) this.sidebar.setCollapsed(true);
      document.body.style.overflow = previousOverflow;
      previousFocus?.focus?.();
    });
  }

  next(): void {
    if (this.isLast()) return;
    this.index.update((i) => i + 1);
    this.schedule();
  }

  previous(): void {
    if (this.isFirst()) return;
    this.index.update((i) => i - 1);
    this.schedule();
  }

  close(): void {
    this.closed.emit();
  }

  /**
   * Prepara el menú para el paso actual y mide dónde resaltar. El menú se despliega con una
   * animación, así que se mide al empezar y de nuevo cuando termina.
   */
  protected schedule(): void {
    this.syncMenu();
    this.clearTimers();
    this.timers = [setTimeout(() => this.measure(), 0), setTimeout(() => this.measure(), 350)];
  }

  /** Despliega el menú en los pasos que resaltan una opción y lo devuelve a como estaba en los demás. */
  private syncMenu(): void {
    const needsMenu = !!this.step()?.target;
    if (needsMenu && this.sidebar.isCollapsed()) {
      this.sidebar.setCollapsed(false);
      this.menuOpenedByGuide = true;
    } else if (!needsMenu && this.menuOpenedByGuide) {
      this.sidebar.setCollapsed(true);
      this.menuOpenedByGuide = false;
    }
  }

  private measure(): void {
    const route = this.step()?.target;
    const target = route ? document.querySelector<HTMLElement>(`a.sidebar__nav-item[href="${route}"]`) : null;
    if (!target || target.getBoundingClientRect().height === 0) {
      // La opción no está (o no se ve): el paso se muestra centrado, sin resaltar.
      this.spot.set(null);
      this.anchored.set(null);
      return;
    }

    target.scrollIntoView?.({ block: 'nearest' });
    const rect = target.getBoundingClientRect();
    const pad = 6;
    const gap = 16;
    const viewportW = window.innerWidth;
    const viewportH = window.innerHeight;
    const isMobile = viewportW <= 900;

    this.mobile.set(isMobile);
    this.spot.set({ left: rect.left - pad, top: rect.top - pad, width: rect.width + pad * 2, height: rect.height + pad * 2 });

    const card = this.dialog()?.nativeElement;
    // scrollHeight es la altura natural de la tarjeta, aunque se haya achicado en una medición anterior.
    const cardHeight = card?.scrollHeight || 300;

    if (isMobile) {
      // En teléfono la tarjeta va abajo o arriba de la opción, del lado donde quepa sin taparla.
      const margin = 16;
      const breathing = 8;
      const below = viewportH - (rect.bottom + pad) - breathing - margin;
      const above = rect.top - pad - breathing - margin;
      if (cardHeight <= below) {
        this.anchored.set({ bottom: margin });
      } else if (cardHeight <= above) {
        this.anchored.set({ top: margin });
      } else if (below >= above) {
        // No cabe en ninguno: se achica al espacio mayor y su contenido se desplaza.
        this.anchored.set({ bottom: margin, maxHeight: Math.max(below, 120) });
      } else {
        this.anchored.set({ top: margin, maxHeight: Math.max(above, 120) });
      }
      return;
    }
    const cardWidth = Math.min(448, viewportW - 32);
    const left = Math.min(rect.right + pad + gap, viewportW - cardWidth - 16);
    const top = Math.min(Math.max(rect.top + rect.height / 2 - cardHeight / 2, 16), Math.max(16, viewportH - cardHeight - 16));
    this.anchored.set({ left, top });
  }

  private clearTimers(): void {
    this.timers.forEach(clearTimeout);
    this.timers = [];
  }

  protected onKeydown(event: KeyboardEvent): void {
    switch (event.key) {
      case 'Escape':
        event.preventDefault();
        this.close();
        break;
      case 'ArrowRight':
        this.next();
        break;
      case 'ArrowLeft':
        this.previous();
        break;
      case 'Tab':
        this.keepFocusInside(event);
        break;
    }
  }

  /** Tab y Shift+Tab dan la vuelta dentro de la ventana, sin salir a la página de atrás. */
  private keepFocusInside(event: KeyboardEvent): void {
    const root = this.dialog()?.nativeElement;
    if (!root) return;
    const buttons = Array.from(root.querySelectorAll<HTMLElement>('button'));
    if (buttons.length === 0) return;
    const first = buttons[0]!;
    const last = buttons.at(-1)!;
    const active = document.activeElement;
    if (event.shiftKey && (active === first || active === root)) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && active === last) {
      event.preventDefault();
      first.focus();
    }
  }
}
