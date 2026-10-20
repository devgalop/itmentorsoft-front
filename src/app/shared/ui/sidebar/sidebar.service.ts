import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class SidebarService {
  readonly isCollapsed = signal(true);

  toggle(): void {
    this.isCollapsed.update(v => !v);
  }

  /** Despliega o contrae el menú (en teléfono, abre o cierra el panel). */
  setCollapsed(collapsed: boolean): void {
    this.isCollapsed.set(collapsed);
  }
}
