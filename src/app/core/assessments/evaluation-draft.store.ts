import { Injectable } from '@angular/core';
import { TopicQuestion } from './student-assessment.types';

/** Una evaluación empezada y sin enviar, con lo que el estudiante lleva escrito. */
export interface EvaluationDraft {
  userId: string;
  assessmentId: string;
  questions: TopicQuestion[];
  /** Respuesta escrita por pregunta (`question_id`). */
  answers: Record<string, string>;
  /** Segundos acumulados por pregunta (`question_id`). */
  times: Record<string, number>;
  currentIndex: number;
  /** Marca de tiempo (ms) del último guardado. */
  savedAt: number;
}

const KEY_PREFIX = 'itm.evaluation-draft.';
/** Pasado este tiempo se considera abandonada y se descarta. */
export const DRAFT_TTL_MS = 24 * 60 * 60 * 1000;

/**
 * Guarda en el navegador la evaluación en curso para poder retomarla si el estudiante recarga la
 * página o cierra la pestaña. Es una sola por estudiante.
 */
@Injectable({ providedIn: 'root' })
export class EvaluationDraftStore {
  get(userId: string, now = Date.now()): EvaluationDraft | null {
    try {
      const parsed = JSON.parse(localStorage.getItem(KEY_PREFIX + userId) ?? 'null') as EvaluationDraft | null;
      if (!parsed || !this.isValid(parsed, userId)) return null;
      if (now - parsed.savedAt > DRAFT_TTL_MS) {
        this.clear(userId);
        return null;
      }
      return parsed;
    } catch {
      return null;
    }
  }

  save(draft: EvaluationDraft): void {
    try {
      localStorage.setItem(KEY_PREFIX + draft.userId, JSON.stringify(draft));
    } catch {
      // Sin almacenamiento: la evaluación sigue, pero no se podrá retomar tras recargar.
    }
  }

  clear(userId: string): void {
    try {
      localStorage.removeItem(KEY_PREFIX + userId);
    } catch {
      // Nada que limpiar.
    }
  }

  private isValid(d: EvaluationDraft, userId: string): boolean {
    return (
      d.userId === userId &&
      typeof d.assessmentId === 'string' &&
      d.assessmentId.length > 0 &&
      Array.isArray(d.questions) &&
      d.questions.length > 0 &&
      typeof d.savedAt === 'number' &&
      !!d.answers &&
      typeof d.answers === 'object'
    );
  }
}
