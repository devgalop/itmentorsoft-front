import { Injectable, computed, signal } from '@angular/core';
import { GUIDE_STEPS } from './guide-content';
import { GuideRole } from './guide.types';

const KEY_PREFIX = 'itm.guide.seen.';

/**
 * Guía de uso de cada perfil. Se abre sola la primera vez que la persona entra con su perfil y
 * se puede volver a abrir a mano. Que ya se vio se recuerda en el navegador, por usuario y por rol
 * (si se limpia el almacenamiento, o se entra desde otro navegador, se muestra otra vez).
 */
@Injectable({ providedIn: 'root' })
export class GuideService {
  private readonly current = signal<{ role: GuideRole; userId: string } | null>(null);

  readonly isOpen = computed(() => this.current() !== null);
  readonly steps = computed(() => {
    const current = this.current();
    return current ? GUIDE_STEPS[current.role] : [];
  });

  /** La abre solo si esta persona todavía no la vio con ese perfil. */
  startIfFirstTime(role: GuideRole, userId: string): void {
    if (!userId || this.hasSeen(role, userId)) return;
    this.current.set({ role, userId });
  }

  /** La abre a mano (botón "Guía"), la haya visto o no. */
  open(role: GuideRole, userId: string): void {
    this.current.set({ role, userId });
  }

  /** La cierra (Omitir, Entendido o Esc) y recuerda que ya se vio. */
  close(): void {
    const current = this.current();
    if (current) this.markSeen(current.role, current.userId);
    this.current.set(null);
  }

  hasSeen(role: GuideRole, userId: string): boolean {
    try {
      return localStorage.getItem(this.key(role, userId)) === '1';
    } catch {
      // Sin almacenamiento no se puede saber: se trata como no vista, pero solo molesta una vez por sesión.
      return false;
    }
  }

  private markSeen(role: GuideRole, userId: string): void {
    try {
      localStorage.setItem(this.key(role, userId), '1');
    } catch {
      // Sin almacenamiento: se vuelve a mostrar la próxima vez.
    }
  }

  private key(role: GuideRole, userId: string): string {
    return `${KEY_PREFIX}${role}.${userId}`;
  }
}
