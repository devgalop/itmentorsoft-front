import { Injectable, signal } from '@angular/core';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface Toast {
  id: number;
  type: ToastType;
  title: string;
  message?: string;
  /** ms hasta el auto-cierre; 0 = no se cierra solo. */
  duration: number;
}

const DEFAULT_DURATION = 4000;

@Injectable({ providedIn: 'root' })
export class ToastService {
  private nextId = 1;
  readonly toasts = signal<Toast[]>([]);
  private timers = new Map<number, ReturnType<typeof setTimeout>>();

  /** Toast genérico. Los de tipo 'error' no se cierran solos por defecto. */
  show(type: ToastType, title: string, message?: string, duration?: number): number {
    const id = this.nextId++;
    const finalDuration = duration ?? (type === 'error' ? 0 : DEFAULT_DURATION);
    const toast: Toast = { id, type, title, message, duration: finalDuration };
    this.toasts.update((list) => [...list, toast]);
    if (finalDuration > 0) {
      this.timers.set(
        id,
        setTimeout(() => this.dismiss(id), finalDuration),
      );
    }
    return id;
  }

  success(title: string, message?: string, duration?: number): number {
    return this.show('success', title, message, duration);
  }

  error(title: string, message?: string, duration?: number): number {
    return this.show('error', title, message, duration);
  }

  info(title: string, message?: string, duration?: number): number {
    return this.show('info', title, message, duration);
  }

  warning(title: string, message?: string, duration?: number): number {
    return this.show('warning', title, message, duration);
  }

  dismiss(id: number): void {
    const timer = this.timers.get(id);
    if (timer) {
      clearTimeout(timer);
      this.timers.delete(id);
    }
    this.toasts.update((list) => list.filter((t) => t.id !== id));
  }

  clear(): void {
    this.timers.forEach((t) => clearTimeout(t));
    this.timers.clear();
    this.toasts.set([]);
  }
}
