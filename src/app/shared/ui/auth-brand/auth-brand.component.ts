import { ChangeDetectionStrategy, Component } from '@angular/core';

/**
 * Logo y nombre de la marca para las pantallas de acceso. Solo se ve en teléfono: en pantallas
 * grandes esas pantallas ya muestran la marca en su panel lateral o no la necesitan.
 */
@Component({
  selector: 'app-auth-brand',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="brand">
      <div class="brand__icon">
        <svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
          <rect x="7" y="11" width="18" height="14" rx="4" fill="#0D2B6E" />
          <circle cx="12" cy="17" r="2.5" fill="#1ABCB0" />
          <circle cx="20" cy="17" r="2.5" fill="#1ABCB0" />
          <path d="M12 22 Q16 25 20 22" stroke="#1ABCB0" stroke-width="1.5" stroke-linecap="round" fill="none" />
          <line x1="16" y1="5" x2="16" y2="11" stroke="#0D2B6E" stroke-width="2" />
          <circle cx="16" cy="4" r="2.5" fill="#1ABCB0" />
          <rect x="2" y="14" width="5" height="7" rx="2.5" fill="#1ABCB0" opacity=".6" />
          <rect x="25" y="14" width="5" height="7" rx="2.5" fill="#1ABCB0" opacity=".6" />
        </svg>
      </div>
      <strong class="brand__name">ITMentorSoft</strong>
    </div>
  `,
  styles: `
    :host {
      display: none;
    }

    @media (max-width: 767px) {
      :host {
        display: block;
        width: 100%;
        max-width: 420px;
      }
    }

    .brand {
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }

    .brand__icon {
      width: 40px;
      height: 40px;
      background: var(--color-accent-pale);
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }

    .brand__icon svg {
      width: 26px;
      height: 26px;
    }

    .brand__name {
      color: var(--color-white);
      font-size: 1.25rem;
      font-weight: 800;
      letter-spacing: -0.02em;
    }
  `,
})
export class AuthBrandComponent {}
