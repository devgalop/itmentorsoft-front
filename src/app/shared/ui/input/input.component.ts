import { ChangeDetectionStrategy, Component, Input, signal } from '@angular/core';
import { ReactiveFormsModule, FormControl } from '@angular/forms';

@Component({
  selector: 'app-input',
  standalone: true,
  imports: [ReactiveFormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="app-input__wrap">
      <input
        [type]="isPassword && showPassword() ? 'text' : type"
        [formControl]="control"
        [placeholder]="placeholder"
        [attr.name]="id"
        [attr.aria-invalid]="error ? true : null"
        [attr.aria-describedby]="error ? id + '-error' : null"
        [id]="id"
        class="app-input"
        [class.app-input--toggle]="isPassword"
      />
      @if (isPassword) {
        <button
          type="button"
          class="app-input__toggle"
          [attr.aria-label]="showPassword() ? 'Ocultar contraseña' : 'Mostrar contraseña'"
          [attr.aria-pressed]="showPassword()"
          (click)="showPassword.set(!showPassword())"
        >
          @if (showPassword()) {
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
              <line x1="1" y1="1" x2="23" y2="23" />
            </svg>
          } @else {
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
          }
        </button>
      }
    </div>
    @if (error) {
      <span class="app-input__error" role="alert" [id]="id + '-error'">
        {{ error }}
      </span>
    }
  `,
  styles: `
    .app-input__wrap {
      position: relative;
    }

    .app-input--toggle {
      padding-right: 2.75rem;
    }

    .app-input__toggle {
      position: absolute;
      top: 50%;
      right: 0.375rem;
      transform: translateY(-50%);
      display: flex;
      align-items: center;
      justify-content: center;
      width: 2.25rem;
      height: 2.25rem;
      padding: 0;
      border: none;
      border-radius: 0.375rem;
      background: transparent;
      color: var(--color-mid-2);
      cursor: pointer;

      &:hover {
        color: var(--color-primary);
      }

      &:focus-visible {
        outline: 2px solid var(--color-secondary);
      }

      svg {
        width: 1.25rem;
        height: 1.25rem;
        fill: none;
        stroke: currentColor;
        stroke-width: 1.8;
        stroke-linecap: round;
        stroke-linejoin: round;
      }
    }

    .app-input {
      width: 100%;
      padding: 0.75rem 1rem;
      border: 1px solid var(--color-light-1);
      border-radius: 0.5rem;
      font-size: 1rem;
      color: var(--color-primary);
      background: var(--color-white);
      transition: border-color 0.2s, box-shadow 0.2s;

      &:focus {
        outline: none;
        border-color: var(--color-secondary);
        box-shadow: 0 0 0 3px color-mix(in srgb, var(--color-secondary) 20%, transparent);
      }

      &[aria-invalid="true"] {
        border-color: #e53e3e;
      }

      &:disabled {
        background: var(--color-light-2);
        cursor: not-allowed;
      }
    }

    .app-input__error {
      display: block;
      margin-top: 0.375rem;
      font-size: 0.875rem;
      color: #e53e3e;
    }
  `,
})
export class InputComponent {
  @Input({ required: true }) id!: string;
  @Input() type: string = 'text';
  @Input() placeholder: string = '';
  @Input({ required: true }) control!: FormControl<string | null>;
  @Input() error: string | null = null;

  /** En los campos de contraseña, un botón permite ver lo que se escribió. */
  readonly showPassword = signal(false);

  get isPassword(): boolean {
    return this.type === 'password';
  }
}
