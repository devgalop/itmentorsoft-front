import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '@core/auth/auth.service';
import { ReportsService } from '@core/reports/reports.service';
import { ContentService } from '@core/content/content.service';
import { AssessmentsService } from '@core/assessments/assessments.service';
import { UsersService } from '@core/users/users.service';
import { StudentClassification } from '@core/reports/reports.types';

interface CategoryCount {
  category: string;
  count: number;
  pct: number;
}

@Component({
  selector: 'app-teacher-dashboard',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './teacher-dashboard.component.html',
  styleUrl: './teacher-dashboard.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TeacherDashboardComponent {
  private readonly authService = inject(AuthService);
  private readonly reports = inject(ReportsService);
  private readonly content = inject(ContentService);
  private readonly assessments = inject(AssessmentsService);
  private readonly usersService = inject(UsersService);

  /** Nombre real del docente (se carga del backend). */
  private readonly displayName = signal<string | null>(null);
  /** Lo que se muestra en el saludo: el nombre, o el username si aún no llegó. */
  readonly userName = computed(
    () => this.displayName() ?? this.authService.user()?.userName ?? 'Docente',
  );

  readonly studentsTotal = signal<number | null>(null);
  readonly categoriesTotal = signal<number | null>(null);
  readonly resourcesTotal = signal<number | null>(null);

  readonly recentStudents = signal<StudentClassification[]>([]);
  readonly byCategory = signal<CategoryCount[]>([]);
  readonly isLoading = signal(true);

  constructor() {
    const id = this.authService.userId();
    if (id) void this.loadDisplayName(id);
    void this.load();
  }
  /**
   * El JWT solo trae el usuario (username); el nombre real se pide al backend. Mientras
   * llega, o si falla, el saludo usa el username.
   */
  private async loadDisplayName(userId: string): Promise<void> {
    try {
      const user = await this.usersService.getUser(userId);
      const name = user?.name?.trim();
      if (name) this.displayName.set(name);
    } catch {
      // Sin nombre: se queda con el username.
    }
  }


  async load(): Promise<void> {
    this.isLoading.set(true);

    const [students, categories, contents] = await Promise.allSettled([
      this.reports.getStudents(0, 100),
      this.assessments.getCategories(),
      this.content.getAllContents(0, 100),
    ]);

    if (students.status === 'fulfilled') {
      const list = students.value.students;
      this.studentsTotal.set(students.value.total);
      this.recentStudents.set(list.slice(0, 5));
      this.byCategory.set(this.groupByCategory(list));
    }

    if (categories.status === 'fulfilled') {
      this.categoriesTotal.set(categories.value.length);
    }

    if (contents.status === 'fulfilled') {
      this.resourcesTotal.set(contents.value.length);
    }

    this.isLoading.set(false);
  }

  private groupByCategory(students: StudentClassification[]): CategoryCount[] {
    if (students.length === 0) {
      return [];
    }
    const counts = new Map<string, number>();
    for (const s of students) {
      const key = s.knowledge_classification || 'Sin clasificar';
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    const total = students.length;
    return Array.from(counts.entries())
      .map(([category, count]) => ({
        category,
        count,
        pct: Math.round((count / total) * 100),
      }))
      .sort((a, b) => b.count - a.count);
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
