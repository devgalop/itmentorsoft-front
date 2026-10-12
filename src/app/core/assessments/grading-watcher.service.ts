import { Injectable, inject, signal } from '@angular/core';
import { ToastService } from '@shared/ui/toast/toast.service';
import { StudentAssessmentService } from './student-assessment.service';

/** Una evaluación enviada que todavía no termina de calificarse. */
export interface PendingGrading {
  assessmentId: string;
  userId: string;
  /** Marca de tiempo (ms) del envío, para dejar de esperar pasado el tiempo máximo. */
  startedAt: number;
}

const STORAGE_KEY = 'itm.grading-pending';
const FIRST_DELAY_MS = 3000;
const MAX_DELAY_MS = 15000;
/** Pasado este tiempo se deja de esperar (el correo y el historial siguen avisando). */
export const MAX_WAIT_MS = 15 * 60 * 1000;

/**
 * La calificación es asíncrona: el estudiante envía y se va a otra pantalla. Este servicio
 * (global) sigue preguntando al backend si ya terminó, avisa con un mensaje y le dice a las
 * pantallas que muestran datos (`completedCount`) que se actualicen.
 */
@Injectable({ providedIn: 'root' })
export class GradingWatcherService {
  private readonly assessments = inject(StudentAssessmentService);
  private readonly toast = inject(ToastService);

  readonly pending = signal<PendingGrading[]>([]);
  /** Sube cada vez que una calificación termina. */
  readonly completedCount = signal(0);

  private readonly timers = new Map<string, ReturnType<typeof setTimeout>>();

  /** Empieza a esperar una evaluación recién enviada. */
  watch(userId: string, assessmentId: string): void {
    this.track({ assessmentId, userId, startedAt: Date.now() });
  }

  /** Retoma las evaluaciones pendientes guardadas (al abrir la app o recargar). */
  resume(userId: string): void {
    for (const p of this.readStored()) {
      if (p.userId !== userId) continue;
      if (Date.now() - p.startedAt > MAX_WAIT_MS) {
        this.remove(p.assessmentId);
        continue;
      }
      this.track(p, false);
    }
  }

  /** ¿Hay evaluaciones del estudiante esperando calificación? */
  hasPending(userId: string | null | undefined): boolean {
    return !!userId && this.pending().some((p) => p.userId === userId);
  }

  private track(p: PendingGrading, persist = true): void {
    if (this.pending().some((x) => x.assessmentId === p.assessmentId)) return;
    this.pending.update((list) => [...list, p]);
    if (persist) this.writeStored();
    this.schedule(p, 0);
  }

  private schedule(p: PendingGrading, attempt: number): void {
    const delay = Math.min(FIRST_DELAY_MS + attempt * 1000, MAX_DELAY_MS);
    this.timers.set(
      p.assessmentId,
      setTimeout(() => void this.check(p, attempt), delay),
    );
  }

  private async check(p: PendingGrading, attempt: number): Promise<void> {
    if (!this.pending().some((x) => x.assessmentId === p.assessmentId)) return;
    try {
      if (await this.assessments.getQualificationStatus(p.userId, p.assessmentId)) {
        this.finish(p);
        return;
      }
    } catch {
      // Reintenta en silencio: un fallo de red no debe cortar la espera.
    }
    if (Date.now() - p.startedAt > MAX_WAIT_MS) {
      this.remove(p.assessmentId);
      this.toast.warning(
        'La calificación está tardando',
        'Te llegará un correo cuando termine; también la verás en Mis evaluaciones.',
        8000,
      );
      return;
    }
    this.schedule(p, attempt + 1);
  }

  private finish(p: PendingGrading): void {
    this.remove(p.assessmentId);
    this.completedCount.update((n) => n + 1);
    this.toast.show('success', 'Tu evaluación fue calificada', 'Ya puedes ver tu resultado.', 8000, {
      label: 'Ver resultado',
      route: ['/student/assessments'],
      queryParams: { result: p.assessmentId },
    });
  }

  private remove(assessmentId: string): void {
    const timer = this.timers.get(assessmentId);
    if (timer) clearTimeout(timer);
    this.timers.delete(assessmentId);
    this.pending.update((list) => list.filter((x) => x.assessmentId !== assessmentId));
    this.writeStored();
  }

  private readStored(): PendingGrading[] {
    try {
      const parsed: unknown = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]');
      return Array.isArray(parsed)
        ? parsed.filter(
            (p): p is PendingGrading =>
              !!p && typeof p.assessmentId === 'string' && typeof p.userId === 'string' && typeof p.startedAt === 'number',
          )
        : [];
    } catch {
      return [];
    }
  }

  private writeStored(): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.pending()));
    } catch {
      // Sin almacenamiento: la espera sigue mientras la página esté abierta.
    }
  }
}
