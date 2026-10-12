import { Injectable } from '@angular/core';
import { TopicPathRef } from './content.types';

const KEY_PREFIX = 'itm.learning-paths.';

/**
 * Guarda en el navegador los ids de los temas de la ruta del estudiante. El backend los entrega
 * una sola vez, al generar la ruta, y no tiene cómo volver a listarlos: sin esto, al recargar no
 * habría forma de consultar los temas.
 */
@Injectable({ providedIn: 'root' })
export class LearningPathStore {
  get(userId: string): TopicPathRef[] {
    try {
      const parsed: unknown = JSON.parse(localStorage.getItem(KEY_PREFIX + userId) ?? '[]');
      return Array.isArray(parsed)
        ? parsed.filter(
            (p): p is TopicPathRef =>
              !!p && typeof p.topic_path_id === 'string' && p.topic_path_id.length > 0 && typeof p.topic === 'string',
          )
        : [];
    } catch {
      return [];
    }
  }

  set(userId: string, refs: TopicPathRef[]): void {
    try {
      localStorage.setItem(KEY_PREFIX + userId, JSON.stringify(refs));
    } catch {
      // Sin almacenamiento: la ruta se muestra, pero habrá que generarla de nuevo al recargar.
    }
  }

  clear(userId: string): void {
    try {
      localStorage.removeItem(KEY_PREFIX + userId);
    } catch {
      // Nada que limpiar.
    }
  }
}
