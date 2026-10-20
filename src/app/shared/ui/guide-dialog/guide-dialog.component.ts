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

/**
 * Ventana de bienvenida con pasos (guía de uso). Muestra un paso a la vez, con puntos de avance y
 * botones Anterior / Siguiente / Omitir; el último paso cierra con "Entendido". Se maneja con el
 * teclado (flechas para avanzar o volver, Esc para cerrar, Tab se queda dentro de la ventana),
 * bloquea el scroll de la página mientras está abierta y devuelve el foco a donde estaba al cerrarse.
 */
@Component({
  selector: 'app-guide-dialog',
  standalone: true,
  imports: [SidebarIconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '(document:keydown)': 'onKeydown($event)' },
  template: `
    @if (step(); as s) {
      <div class="guide__backdrop">
        <div
          #dialog
          class="guide"
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

  private readonly dialog = viewChild<ElementRef<HTMLElement>>('dialog');

  constructor() {
    const previousFocus = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    // Mientras está abierta, la página de atrás no se desplaza.
    document.body.style.overflow = 'hidden';
    afterNextRender(() => this.dialog()?.nativeElement.focus());

    inject(DestroyRef).onDestroy(() => {
      document.body.style.overflow = previousOverflow;
      previousFocus?.focus?.();
    });
  }

  next(): void {
    if (!this.isLast()) this.index.update((i) => i + 1);
  }

  previous(): void {
    if (!this.isFirst()) this.index.update((i) => i - 1);
  }

  close(): void {
    this.closed.emit();
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
    const last = buttons[buttons.length - 1]!;
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
