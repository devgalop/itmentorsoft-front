import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { ReportsService } from '@core/reports/reports.service';
import { StudentClassification } from '@core/reports/reports.types';

const PAGE_SIZE = 10;

@Component({
  selector: 'app-teacher-students',
  standalone: true,
  templateUrl: './teacher-students.component.html',
  styleUrl: './teacher-students.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TeacherStudentsComponent {
  private readonly reports = inject(ReportsService);

  readonly students = signal<StudentClassification[]>([]);
  readonly total = signal(0);
  readonly page = signal(0);
  readonly pageSize = PAGE_SIZE;

  readonly isLoading = signal(false);
  readonly loadError = signal<string | null>(null);

  readonly totalPages = computed(() =>
    this.total() > 0 ? Math.ceil(this.total() / this.pageSize) : 0,
  );

  constructor() {
    void this.load(0);
  }

  async load(page: number): Promise<void> {
    this.isLoading.set(true);
    this.loadError.set(null);
    try {
      const result = await this.reports.getStudents(page, this.pageSize);
      this.students.set(result.students);
      this.total.set(result.total);
      this.page.set(page);
    } catch (error) {
      this.students.set([]);
      this.total.set(0);
      this.loadError.set(error instanceof Error ? error.message : 'Error al cargar estudiantes');
    } finally {
      this.isLoading.set(false);
    }
  }

  async nextPage(): Promise<void> {
    if (this.page() + 1 < this.totalPages()) {
      await this.load(this.page() + 1);
    }
  }

  async prevPage(): Promise<void> {
    if (this.page() > 0) {
      await this.load(this.page() - 1);
    }
  }

  initials(name: string): string {
    return name
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase() ?? '')
      .join('');
  }
}
