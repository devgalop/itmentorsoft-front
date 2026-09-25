import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { vi } from 'vitest';
import { TeacherReportsComponent } from './teacher-reports.component';
import { ReportsService } from '../../../core/reports/reports.service';

describe('TeacherReportsComponent', () => {
  let reportsMock: {
    getStudentsByCategory: ReturnType<typeof vi.fn>;
    getCategorySummary: ReturnType<typeof vi.fn>;
  };

  function make(): TeacherReportsComponent {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        TeacherReportsComponent,
        provideRouter([]),
        { provide: ReportsService, useValue: reportsMock },
      ],
    });
    return TestBed.inject(TeacherReportsComponent);
  }

  function page(students: unknown[], total: number) {
    return { students, total };
  }

  beforeEach(() => {
    reportsMock = {
      getStudentsByCategory: vi.fn().mockResolvedValue(
        page(
          [
            { student_id: 's1', student_name: 'Ana Pérez', knowledge_classification: 'principiante' },
          ],
          1,
        ),
      ),
      getCategorySummary: vi.fn().mockResolvedValue(5),
    };
  });

  it('loads the first category on creation', async () => {
    const c = make();
    await Promise.resolve();
    await Promise.resolve();
    expect(reportsMock.getStudentsByCategory).toHaveBeenCalledWith('principiante', 0, 10);
    expect(c.students()).toHaveLength(1);
    expect(c.total()).toBe(1);
  });

  it('reloads from page 0 when the category changes', async () => {
    const c = make();
    await Promise.resolve();
    c.onCategoryChange('avanzado');
    await Promise.resolve();
    await Promise.resolve();
    expect(c.selectedCategory()).toBe('avanzado');
    expect(reportsMock.getStudentsByCategory).toHaveBeenLastCalledWith('avanzado', 0, 10);
  });

  it('paginates forward when there are more pages', async () => {
    reportsMock.getStudentsByCategory.mockResolvedValue(page(new Array(10).fill({ student_id: 'x', student_name: 'X', knowledge_classification: 'básico' }), 25));
    const c = make();
    await Promise.resolve();
    await Promise.resolve();
    expect(c.canNext()).toBe(true);
    c.next();
    await Promise.resolve();
    await Promise.resolve();
    expect(reportsMock.getStudentsByCategory).toHaveBeenLastCalledWith('principiante', 1, 10);
  });

  it('captures an error and clears the list', async () => {
    reportsMock.getStudentsByCategory.mockRejectedValue(new Error('Error en el servidor'));
    const c = make();
    await Promise.resolve();
    await Promise.resolve();
    expect(c.loadError()).toBe('Error en el servidor');
    expect(c.students()).toEqual([]);
  });

  it('maps category codes to labels', () => {
    const c = make();
    expect(c.classificationLabel('básico')).toBe('Básico');
    expect(c.classificationLabel('avanzado')).toBe('Avanzado');
  });

  it('loads the category distribution on creation', async () => {
    const c = make();
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
    // 4 categorías consultadas
    expect(reportsMock.getCategorySummary).toHaveBeenCalledTimes(4);
    expect(c.distribution().length).toBe(4);
    // cada una devolvió 5 -> total 20 y 25% cada una
    expect(c.distributionTotal()).toBe(20);
    expect(c.percent(5)).toBe(25);
  });
});
