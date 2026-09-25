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

  const flush = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

  it('counts a category as 0 when its summary fails and still finishes loading', async () => {
    reportsMock.getCategorySummary.mockImplementation(async (category: string) => {
      if (category === 'básico') throw new Error('boom');
      return 5;
    });
    const c = make();
    await flush();

    const basico = c.distribution().find((d) => d.value === 'básico');
    expect(basico?.count).toBe(0);
    expect(c.distributionTotal()).toBe(15);
    expect(c.isLoadingDistribution()).toBe(false);
  });

  it('percent is 0 when there are no students at all', async () => {
    reportsMock.getCategorySummary.mockResolvedValue(0);
    const c = make();
    await flush();
    expect(c.percent(0)).toBe(0);
  });

  it('marks the search as done and stops loading after a successful load', async () => {
    const c = make();
    expect(c.hasSearched()).toBe(false);
    await flush();
    expect(c.hasSearched()).toBe(true);
    expect(c.isLoading()).toBe(false);
    expect(c.loadError()).toBeNull();
  });

  it('uses a generic message when loading fails with something that is not an Error', async () => {
    reportsMock.getStudentsByCategory.mockRejectedValue('boom');
    const c = make();
    await flush();
    expect(c.loadError()).toBe('Error al cargar los estudiantes');
    expect(c.total()).toBe(0);
    expect(c.hasSearched()).toBe(true);
  });

  describe('pagination', () => {
    function pageOf(total: number) {
      return page(new Array(10).fill({ student_id: 'x', student_name: 'X', knowledge_classification: 'básico' }), total);
    }

    it('has one page and no navigation when there are no students', async () => {
      reportsMock.getStudentsByCategory.mockResolvedValue(page([], 0));
      const c = make();
      await flush();
      expect(c.totalPages()).toBe(1);
      expect(c.canPrev()).toBe(false);
      expect(c.canNext()).toBe(false);
    });

    it('prev does nothing on the first page', async () => {
      const c = make();
      await flush();
      reportsMock.getStudentsByCategory.mockClear();

      c.prev();
      await flush();

      expect(reportsMock.getStudentsByCategory).not.toHaveBeenCalled();
    });

    it('next does nothing on the last page', async () => {
      const c = make();
      await flush();
      reportsMock.getStudentsByCategory.mockClear();

      c.next();
      await flush();

      expect(reportsMock.getStudentsByCategory).not.toHaveBeenCalled();
    });

    it('prev goes back one page', async () => {
      reportsMock.getStudentsByCategory.mockResolvedValue(pageOf(25));
      const c = make();
      await flush();
      c.next();
      await flush();
      expect(c.page()).toBe(1);

      c.prev();
      await flush();

      expect(reportsMock.getStudentsByCategory).toHaveBeenLastCalledWith('principiante', 0, 10);
      expect(c.page()).toBe(0);
    });
  });

  describe('helpers', () => {
    it('initials handles empty, single and multi-part names', () => {
      const c = make();
      expect(c.initials('')).toBe('');
      expect(c.initials('ana')).toBe('AN');
      expect(c.initials('Ana María López')).toBe('AM');
    });

    it('classificationLabel is case-insensitive and keeps unknown values', () => {
      const c = make();
      expect(c.classificationLabel('BÁSICO')).toBe('Básico');
      expect(c.classificationLabel('experto')).toBe('experto');
    });
  });
});
