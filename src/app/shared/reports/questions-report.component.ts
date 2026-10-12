import { ChangeDetectionStrategy, Component, OnInit, computed, inject, input, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ApprovalService } from '@core/admin/approval.service';
import { AssessmentsService } from '@core/assessments/assessments.service';
import { QuestionListItem } from '@core/assessments/assessments.types';
import { levelColor } from '@shared/charts/chart-colors';
import { ChartItem } from '@shared/charts/chart-item';
import { ColumnChartComponent } from '@shared/charts/column-chart.component';
import { PieChartComponent } from '@shared/charts/pie-chart.component';
import { StatCardsComponent } from '@shared/charts/stat-cards.component';
import { toCategoryItems } from '@shared/charts/chart-utils';

const PAGE_SIZE = 100;
/** Tope de seguridad: 20 páginas de 100 preguntas. */
const MAX_PAGES = 20;
const DIFFICULTY_ORDER = ['básico', 'intermedio', 'avanzado'];

const STATUSES: { value: string; label: string; color: string }[] = [
  { value: 'published', label: 'Publicadas', color: '#1ABCB0' },
  { value: 'draft', label: 'En borrador', color: '#D97706' },
  { value: 'archived', label: 'Archivadas', color: '#7C8AA5' },
];

function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/**
 * Composición del banco de preguntas activas (última versión de cada una): por dificultad, por
 * categoría y por estado, más las que esperan aprobación.
 */
@Component({
  selector: 'app-questions-report',
  standalone: true,
  imports: [RouterLink, ColumnChartComponent, PieChartComponent, StatCardsComponent],
  templateUrl: './questions-report.component.html',
  styleUrl: './questions-report.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class QuestionsReportComponent implements OnInit {
  private readonly assessments = inject(AssessmentsService);
  private readonly approval = inject(ApprovalService);

  /** El aviso de preguntas pendientes de aprobación solo lo puede consultar el admin. */
  readonly showPending = input(true);

  readonly isLoading = signal(true);
  readonly loadError = signal<string | null>(null);
  readonly questions = signal<QuestionListItem[]>([]);
  /** null si no se pudo consultar. */
  readonly pendingTotal = signal<number | null>(null);

  readonly total = computed(() => this.questions().length);

  readonly difficultyItems = computed<ChartItem[]>(() => {
    const counts = new Map<string, number>();
    for (const q of this.questions()) {
      const key = (q.difficulty ?? '').trim().toLowerCase() || 'sin dificultad';
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    const known = DIFFICULTY_ORDER.map((key) => [key, counts.get(key) ?? 0] as const);
    const others = [...counts].filter(([key]) => !DIFFICULTY_ORDER.includes(key));
    return [...known, ...others].map(([key, count]) => ({
      key,
      label: capitalize(key),
      count,
      color: levelColor(key),
    }));
  });

  readonly categoryItems = computed<ChartItem[]>(() => {
    const counts = new Map<string, number>();
    for (const q of this.questions()) {
      const key = (q.classification ?? '').trim() || 'Sin clasificar';
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    return toCategoryItems(
      [...counts]
        .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
        .map(([key, count]) => ({ key, label: key, count })),
    );
  });

  readonly statusItems = computed<ChartItem[]>(() =>
    STATUSES.map((s) => ({
      key: s.value,
      label: s.label,
      count: this.questions().filter((q) => (q.status ?? '').toLowerCase() === s.value).length,
      color: s.color,
    })),
  );

  ngOnInit(): void {
    void this.load();
  }

  private async load(): Promise<void> {
    this.isLoading.set(true);
    this.loadError.set(null);
    const [questions, pending] = await Promise.allSettled([
      this.fetchAll(),
      this.showPending() ? this.approval.getPending(0, 1) : Promise.reject(new Error('sin permiso')),
    ]);
    if (questions.status === 'fulfilled') {
      this.questions.set(questions.value);
    } else {
      this.questions.set([]);
      this.loadError.set(
        questions.reason instanceof Error ? questions.reason.message : 'No se pudo cargar el banco de preguntas.',
      );
    }
    this.pendingTotal.set(pending.status === 'fulfilled' ? pending.value.total : null);
    this.isLoading.set(false);
  }

  /** Recorre las páginas hasta juntar todas las preguntas. */
  private async fetchAll(): Promise<QuestionListItem[]> {
    const all: QuestionListItem[] = [];
    for (let page = 0; page < MAX_PAGES; page++) {
      const result = await this.assessments.getLatestQuestions(page, PAGE_SIZE);
      all.push(...result.questions);
      if (result.questions.length === 0 || all.length >= result.total) break;
    }
    return all;
  }
}
