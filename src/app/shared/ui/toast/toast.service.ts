import { Injectable, signal } from '@angular/core';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

/** Enlace opcional dentro del aviso (por ejemplo "Ver resultado"). */
export interface ToastAction {
  label: string;
  route: string[];
  queryParams?: Record<string, string>;
}

export interface Toast {
  id: number;
  type: ToastType;
  title: string;
  message?: string;
  /** ms hasta el auto-cierre; 0 = no se cierra solo. */
  duration: number;
  action?: ToastAction;
}

const DEFAULT_DURATION = 4000;
/** Los errores se leen con más calma, pero tampoco se quedan para siempre. */
const ERROR_DURATION = 7000;

@Injectable({ providedIn: 'root' })
export class ToastService {
  private nextId = 1;
  readonly toasts = signal<Toast[]>([]);
  private timers = new Map<number, ReturnType<typeof setTimeout>>();

  /**
   * Toast genérico. Todos se cierran solos: 4 s los normales y 7 s los de error (una duración de 0
   * lo deja hasta que se cierre a mano). Si ya hay uno idéntico a la vista, se reemplaza en vez de apilarlos.
   */
  show(type: ToastType, title: string, message?: string, duration?: number, action?: ToastAction): number {
    this.toasts()
      .filter((t) => t.type === type && t.title === title && t.message === message)
      .forEach((t) => this.dismiss(t.id));
    const id = this.nextId++;
    const finalDuration = duration ?? (type === 'error' ? ERROR_DURATION : DEFAULT_DURATION);
    const toast: Toast = { id, type, title, message, duration: finalDuration, action };
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
