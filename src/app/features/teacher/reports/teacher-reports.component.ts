import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ReportsService } from '@core/reports/reports.service';
import { StudentClassification } from '@core/reports/reports.types';

interface CategoryOption {
  value: string;
  label: string;
}

const CATEGORIES: CategoryOption[] = [
  { value: 'principiante', label: 'Principiante' },
  { value: 'básico', label: 'Básico' },
  { value: 'intermedio', label: 'Intermedio' },
  { value: 'avanzado', label: 'Avanzado' },
];

const PAGE_SIZE = 10;

@Component({
  selector: 'app-teacher-reports',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './teacher-reports.component.html',
  styleUrl: './teacher-reports.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TeacherReportsComponent {
  private readonly reports = inject(ReportsService);

  readonly categories = CATEGORIES;
  readonly selectedCategory = signal<string>(CATEGORIES[0]!.value);
  readonly students = signal<StudentClassification[]>([]);
  readonly total = signal(0);
  readonly page = signal(0);
  readonly isLoading = signal(false);
  readonly loadError = signal<string | null>(null);
  readonly hasSearched = signal(false);

  readonly pageSize = PAGE_SIZE;
  readonly totalPages = computed(() => Math.max(1, Math.ceil(this.total() / PAGE_SIZE)));
  readonly canPrev = computed(() => this.page() > 0);
  readonly canNext = computed(() => this.page() + 1 < this.totalPages());

  /** Distribución de estudiantes por categoría (para el resumen superior). */
  readonly distribution = signal<{ value: string; label: string; count: number }[]>([]);
  readonly isLoadingDistribution = signal(true);
  readonly distributionTotal = computed(() =>
    this.distribution().reduce((acc, d) => acc + d.count, 0),
  );

  constructor() {
    void this.loadDistribution();
    void this.load(0);
  }

  /** Trae el conteo de cada categoría en paralelo. */
  async loadDistribution(): Promise<void> {
    this.isLoadingDistribution.set(true);
    try {
      const counts = await Promise.all(
        CATEGORIES.map(async (c) => {
          try {
            const count = await this.reports.getCategorySummary(c.value);
            return { value: c.value, label: c.label, count };
          } catch {
            return { value: c.value, label: c.label, count: 0 };
          }
        }),
      );
      this.distribution.set(counts);
    } finally {
      this.isLoadingDistribution.set(false);
    }
  }

  /** Porcentaje que representa una categoría sobre el total (para la barra). */
  percent(count: number): number {
    const total = this.distributionTotal();
    return total === 0 ? 0 : Math.round((count / total) * 100);
  }

  onCategoryChange(value: string): void {
    this.selectedCategory.set(value);
    void this.load(0);
  }

  async load(page: number): Promise<void> {
    this.isLoading.set(true);
    this.loadError.set(null);
    try {
      const result = await this.reports.getStudentsByCategory(
        this.selectedCategory(),
        page,
        PAGE_SIZE,
      );
      this.students.set(result.students);
      this.total.set(result.total);
      this.page.set(page);
    } catch (error) {
      this.students.set([]);
      this.total.set(0);
      this.loadError.set(error instanceof Error ? error.message : 'Error al cargar los estudiantes');
    } finally {
      this.isLoading.set(false);
      this.hasSearched.set(true);
    }
  }

  prev(): void {
    if (this.canPrev()) void this.load(this.page() - 1);
  }

  next(): void {
    if (this.canNext()) void this.load(this.page() + 1);
  }

  initials(name: string): string {
    const parts = (name ?? '').split(/[\s._-]+/).filter(Boolean);
    if (parts.length === 0) return '';
    if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
    return parts.slice(0, 2).map((p) => p[0]!.toUpperCase()).join('');
  }

  classificationLabel(value: string): string {
    const found = CATEGORIES.find((c) => c.value === value?.toLowerCase());
    return found?.label ?? value;
  }
}
