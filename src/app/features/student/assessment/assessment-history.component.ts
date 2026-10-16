import { ChangeDetectionStrategy, Component, computed, input, output, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { AssessmentSummary } from '@core/assessments/student-assessment.types';
import { scoreColor } from '@shared/charts/chart-colors';
import { levelMedal } from '@shared/charts/level-medal';
import { buildSparkline } from '@shared/charts/sparkline';
import { gradeDelta, rubricGrade, rubricScoreToPct } from '@shared/charts/topic-progress';
import { PagerComponent } from '@shared/ui/pager/pager.component';

export type HistorySort = 'recent' | 'best' | 'worst';

/** Evaluación empezada y sin enviar, para ofrecer retomarla. */
export interface DraftInfo {
  topic: string;
  answered: number;
  total: number;
  relative: string;
}

/** Evaluaciones por página. */
export const HISTORY_PAGE_SIZE = 6;
/** Cuántas evaluaciones recientes dibuja la mini gráfica. */
const SPARK_POINTS = 8;
const DAY_MS = 24 * 60 * 60 * 1000;

interface HistoryRow {
  id: string;
  /** Nota 0–5. */
  grade: number;
  /** Puntaje 0–100, para la barra, el color y el orden. */
  score: number;
  color: string;
  date: string;
  /** "hoy", "ayer", "hace 3 días" o la fecha. */
  relative: string;
  /** Diferencia de nota con la evaluación anterior (null si es la primera). */
  delta: number | null;
  /** Nombre del nivel (o "Sin clasificar"). */
  level: string;
  levelColor: string | null;
  levelRank: number;
  isBest: boolean;
  feedback: string | null;
}

/** "hoy", "ayer", "hace N días" (hasta una semana) o la fecha completa. */
export function relativeDate(value: string, now = new Date()): string {
  const d = new Date(value);
  if (isNaN(d.getTime())) return value;
  const startOf = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const days = Math.round((startOf(now) - startOf(d)) / DAY_MS);
  if (days <= 0) return 'hoy';
  if (days === 1) return 'ayer';
  if (days < 7) return `hace ${days} días`;
  return d.toLocaleDateString();
}

/** Historial de evaluaciones del estudiante: resumen, evolución, lista filtrable y paginada. */
@Component({
  selector: 'app-assessment-history',
  standalone: true,
  imports: [DecimalPipe, PagerComponent],
  templateUrl: './assessment-history.component.html',
  styleUrl: './assessment-history.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AssessmentHistoryComponent {
  /** Todas las evaluaciones del estudiante (el orden no importa). */
  readonly items = input.required<AssessmentSummary[]>();
  readonly loading = input(false);
  /** Hay una evaluación enviada que todavía se está calificando. */
  readonly pending = input(false);
  /** Mientras se abre un resultado, se bloquean los clics. */
  readonly busy = input(false);
  /** Evaluación en curso guardada en el navegador (null si no hay). */
  readonly draft = input<DraftInfo | null>(null);
  readonly resumeDraft = output<void>();
  readonly discardDraft = output<void>();
  readonly openResult = output<string>();
  readonly create = output<void>();

  readonly sort = signal<HistorySort>('recent');
  /** Rango del nivel filtrado (0–3), -1 para "Sin clasificar", null para todos. */
  readonly levelFilter = signal<number | null>(null);
  readonly page = signal(0);
  readonly sparkSize = { w: 120, h: 36 };

  /** De la más reciente a la más antigua, con la variación frente a la anterior. */
  private readonly rows = computed<HistoryRow[]>(() => {
    const valid = this.items().filter((h) => !isNaN(new Date(h.date_taken).getTime()));
    const asc = [...valid].sort((a, b) => new Date(a.date_taken).getTime() - new Date(b.date_taken).getTime());
    const scores = asc.map((h) => rubricScoreToPct(h.score));
    const grades = asc.map((h) => rubricGrade(h.score));
    const best = Math.max(...scores, 0);
    const bestIndex = scores.lastIndexOf(best);
    const rows = asc.map((h, i) => {
      const medal = levelMedal(h.classification);
      return {
        id: h.assessment_id,
        grade: grades[i]!,
        score: scores[i]!,
        color: scoreColor(scores[i]!),
        date: h.date_taken,
        relative: relativeDate(h.date_taken),
        delta: i > 0 ? gradeDelta(grades[i]!, grades[i - 1]!) : null,
        level: medal?.name ?? 'Sin clasificar',
        levelColor: medal?.color ?? null,
        levelRank: medal?.rank ?? -1,
        // Solo se destaca si hay varias evaluaciones y es la mejor más reciente.
        isBest: asc.length > 1 && i === bestIndex,
        feedback: h.feedback?.trim() ? h.feedback.trim() : null,
      };
    });
    return rows.reverse();
  });

  readonly stats = computed(() => {
    const rows = this.rows();
    if (rows.length === 0) return null;
    const scores = rows.map((r) => r.score);
    const grades = rows.map((r) => r.grade);
    const ascScores = [...scores].reverse();
    return {
      total: rows.length,
      average: Math.round((grades.reduce((sum, g) => sum + g, 0) / grades.length) * 10) / 10,
      best: Math.max(...grades),
      last: rows[0]!,
      spark: buildSparkline(ascScores.slice(-SPARK_POINTS), this.sparkSize.w, this.sparkSize.h),
    };
  });

  /** Niveles que aparecen en el historial, para los filtros. */
  readonly levels = computed(() => {
    const seen = new Map<number, { rank: number; name: string }>();
    for (const r of this.rows()) if (!seen.has(r.levelRank)) seen.set(r.levelRank, { rank: r.levelRank, name: r.level });
    return [...seen.values()].sort((a, b) => a.rank - b.rank);
  });

  private readonly filtered = computed(() => {
    const filter = this.levelFilter();
    const rows = filter === null ? this.rows() : this.rows().filter((r) => r.levelRank === filter);
    switch (this.sort()) {
      case 'best':
        return [...rows].sort((a, b) => b.score - a.score);
      case 'worst':
        return [...rows].sort((a, b) => a.score - b.score);
      default:
        return rows;
    }
  });

  readonly totalPages = computed(() => Math.ceil(this.filtered().length / HISTORY_PAGE_SIZE));
  readonly pageRows = computed(() =>
    this.filtered().slice(this.page() * HISTORY_PAGE_SIZE, (this.page() + 1) * HISTORY_PAGE_SIZE),
  );
  readonly hasFilters = computed(() => this.levelFilter() !== null);

  setSort(value: string): void {
    this.sort.set(value === 'best' || value === 'worst' ? value : 'recent');
    this.page.set(0);
  }

  setLevel(rank: number | null): void {
    this.levelFilter.set(this.levelFilter() === rank ? null : rank);
    this.page.set(0);
  }

  prevPage(): void {
    if (this.page() > 0) this.page.update((p) => p - 1);
  }

  nextPage(): void {
    if (this.page() + 1 < this.totalPages()) this.page.update((p) => p + 1);
  }

  formatDate(value: string): string {
    const d = new Date(value);
    return isNaN(d.getTime()) ? value : d.toLocaleString();
  }
}
