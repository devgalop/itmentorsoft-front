import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Toast, ToastService, ToastType } from './toast.service';

@Component({
  selector: 'app-toast-container',
  standalone: true,
  imports: [],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="toasts" aria-live="polite" aria-atomic="true">
      @for (t of toasts(); track t.id) {
        <div class="toast toast--{{ t.type }}" role="alert">
          <span class="toast__icon" aria-hidden="true">{{ icon(t.type) }}</span>
          <div class="toast__content">
            <p class="toast__title">{{ t.title }}</p>
            @if (t.message) {
              <p class="toast__message">{{ t.message }}</p>
            }
          </div>
          <button type="button" class="toast__close" (click)="dismiss(t.id)" aria-label="Cerrar">
            ×
          </button>
        </div>
      }
    </div>
  `,
  styleUrl: './toast-container.component.css',
})
export class ToastContainerComponent {
  private readonly toastService = inject(ToastService);
  readonly toasts = this.toastService.toasts;

  dismiss(id: number): void {
    this.toastService.dismiss(id);
  }

  icon(type: ToastType): string {
    switch (type) {
      case 'success':
        return '✓';
      case 'error':
        return '✕';
      case 'warning':
        return '!';
      default:
        return 'i';
    }
  }
}
