import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { AssessmentsService } from '@core/assessments/assessments.service';
import { ContentService } from '@core/content/content.service';
import { ReportsService } from '@core/reports/reports.service';
import { levelColor } from '@shared/charts/chart-colors';
import { ChartItem } from '@shared/charts/chart-item';
import { PieChartComponent } from '@shared/charts/pie-chart.component';
import { TopContentComponent } from '@shared/charts/top-content.component';
import { toCategoryItems } from '@shared/charts/chart-utils';

/** Niveles de menor a mayor: son los mismos de la clasificación de estudiantes y de los recursos. */
const LEVELS: { value: string; label: string }[] = [
  { value: 'principiante', label: 'Principiante' },
  { value: 'básico', label: 'Básico' },
  { value: 'intermedio', label: 'Intermedio' },
  { value: 'avanzado', label: 'Avanzado' },
];

/**
 * Oferta de recursos: cuántos hay por nivel y por tema, y si algún nivel con estudiantes se
 * quedó sin material. Una consulta fallida cuenta como 0 para no tumbar todo el reporte.
 */
@Component({
  selector: 'app-resources-report',
  standalone: true,
  imports: [PieChartComponent, TopContentComponent],
  templateUrl: './resources-report.component.html',
  styleUrl: './resources-report.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ResourcesReportComponent {
  private readonly content = inject(ContentService);
  private readonly reports = inject(ReportsService);
  private readonly assessments = inject(AssessmentsService);

  /** Si es false no se muestra el bloque de recursos mejor y peor valorados. */
  readonly showTopContent = input(true);

  readonly isLoading = signal(true);
  readonly resourcesByLevel = signal<Record<string, number>>({});
  readonly studentsByLevel = signal<Record<string, number>>({});
  readonly topicCounts = signal<{ topic: string; count: number }[]>([]);

  readonly levelItems = computed<ChartItem[]>(() =>
    LEVELS.map((l) => ({
      key: l.value,
      label: l.label,
      count: this.resourcesByLevel()[l.value] ?? 0,
      color: levelColor(l.value),
    })),
  );

  /** Del tema con más recursos al que tiene menos; los que no caben en la paleta se agrupan en "Otros". */
  readonly topicItems = computed<ChartItem[]>(() =>
    toCategoryItems(
      [...this.topicCounts()]
        .sort((a, b) => b.count - a.count || a.topic.localeCompare(b.topic))
        .map((t) => ({ key: t.topic, label: t.topic, count: t.count })),
    ),
  );

  /** Niveles que tienen estudiantes pero ningún recurso. */
  readonly gaps = computed(() =>
    LEVELS.filter(
      (l) => (this.studentsByLevel()[l.value] ?? 0) > 0 && (this.resourcesByLevel()[l.value] ?? 0) === 0,
    ).map((l) => ({ label: l.label, students: this.studentsByLevel()[l.value] ?? 0 })),
  );

  constructor() {
    void this.load();
  }

  private async count(fn: () => Promise<number>): Promise<number> {
    try {
      return await fn();
    } catch {
      return 0;
    }
  }

  private async load(): Promise<void> {
    this.isLoading.set(true);
    const [resources, students, topics] = await Promise.all([
      Promise.all(
        LEVELS.map(
          async (l) =>
            [l.value, await this.count(async () => (await this.content.getContentsByCategory(l.value, 0, 1)).total)] as const,
        ),
      ),
      Promise.all(
        LEVELS.map(
          async (l) => [l.value, await this.count(() => this.reports.getCategorySummary(l.value))] as const,
        ),
      ),
      this.loadTopicCounts(),
    ]);
    this.resourcesByLevel.set(Object.fromEntries(resources));
    this.studentsByLevel.set(Object.fromEntries(students));
    this.topicCounts.set(topics);
    this.isLoading.set(false);
  }

  private async loadTopicCounts(): Promise<{ topic: string; count: number }[]> {
    let topics: string[] = [];
    try {
      topics = await this.assessments.getTopics();
    } catch {
      return [];
    }
    return Promise.all(
      topics.map(async (topic) => ({
        topic,
        count: await this.count(async () => (await this.content.getContentsByTopic(topic, 0, 1)).total),
      })),
    );
  }
}
