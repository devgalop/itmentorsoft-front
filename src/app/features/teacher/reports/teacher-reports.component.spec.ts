import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { vi } from 'vitest';
import { TeacherReportsComponent } from './teacher-reports.component';
import { ReportsService } from '../../../core/reports/reports.service';

describe('TeacherReportsComponent', () => {
  let reportsMock: {
    getStudents: ReturnType<typeof vi.fn>;
    getStudentsByCategory: ReturnType<typeof vi.fn>;
    getCategorySummary: ReturnType<typeof vi.fn>;
  };

  function createComponent(): TeacherReportsComponent {
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

  const student = (id: string, cls = 'básico') => ({
    student_id: id,
    student_name: 'Est ' + id,
    knowledge_classification: cls,
  });

  async function ready(): Promise<TeacherReportsComponent> {
    const c = createComponent();
    await vi.waitFor(() => {
      expect(c.isLoading()).toBe(false);
      expect(c.isLoadingDistribution()).toBe(false);
    });
    return c;
  }

  beforeEach(() => {
    reportsMock = {
      getStudents: vi.fn().mockResolvedValue({ students: [student('1'), student('2')], total: 2 }),
      getStudentsByCategory: vi.fn().mockResolvedValue({ students: [student('3', 'avanzado')], total: 1 }),
      getCategorySummary: vi.fn().mockImplementation(async (c: string) => ({ básico: 2, avanzado: 1 })[c] ?? 0),
    };
  });

  it('loads all the students on creation, without a level filter', async () => {
    const c = await ready();
    expect(reportsMock.getStudents).toHaveBeenCalledWith(0, 10);
    expect(reportsMock.getStudentsByCategory).not.toHaveBeenCalled();
    expect(c.selectedCategory()).toBeNull();
    expect(c.students()).toHaveLength(2);
    expect(c.total()).toBe(2);
  });

  it('loads the level distribution and builds the colored cards in order', async () => {
    const c = await ready();
    expect(reportsMock.getCategorySummary).toHaveBeenCalledTimes(4);
    expect(c.distributionTotal()).toBe(3);
    expect(c.levelItems().map((i) => [i.label, i.count])).toEqual([
      ['Principiante', 0],
      ['Básico', 2],
      ['Intermedio', 0],
      ['Avanzado', 1],
    ]);
    expect(new Set(c.levelItems().map((i) => i.color)).size).toBe(4);
  });

  it('counts a level as 0 when its summary fails and still finishes loading', async () => {
    reportsMock.getCategorySummary.mockRejectedValue(new Error('x'));
    const c = await ready();
    expect(c.distribution().every((d) => d.count === 0)).toBe(true);
    expect(c.isLoadingDistribution()).toBe(false);
  });

  it('filters the list from page 0 when a level is selected', async () => {
    const c = await ready();
    reportsMock.getStudentsByCategory.mockClear();

    c.onCategorySelect('avanzado');
    await vi.waitFor(() => expect(c.students()[0]?.student_id).toBe('3'));

    expect(reportsMock.getStudentsByCategory).toHaveBeenCalledWith('avanzado', 0, 10);
    expect(c.selectedCategory()).toBe('avanzado');
  });

  it('selecting the active level again shows every student', async () => {
    const c = await ready();
    c.onCategorySelect('avanzado');
    await vi.waitFor(() => expect(c.students()[0]?.student_id).toBe('3'));
    reportsMock.getStudents.mockClear();

    c.onCategorySelect('avanzado');
    await vi.waitFor(() => expect(c.students()).toHaveLength(2));

    expect(c.selectedCategory()).toBeNull();
    expect(reportsMock.getStudents).toHaveBeenCalledWith(0, 10);
  });

  it('clearFilter goes back to all the students', async () => {
    const c = await ready();
    c.onCategorySelect('básico');
    await vi.waitFor(() => expect(reportsMock.getStudentsByCategory).toHaveBeenCalled());
    reportsMock.getStudents.mockClear();

    c.clearFilter();
    await vi.waitFor(() => expect(reportsMock.getStudents).toHaveBeenCalledWith(0, 10));
    expect(c.selectedCategory()).toBeNull();
  });

  it('paginates forward and backward', async () => {
    reportsMock.getStudents.mockResolvedValue({ students: [student('1')], total: 25 });
    const c = await ready();
    expect(c.totalPages()).toBe(3);

    c.next();
    await vi.waitFor(() => expect(c.page()).toBe(1));
    expect(reportsMock.getStudents).toHaveBeenLastCalledWith(1, 10);

    c.prev();
    await vi.waitFor(() => expect(c.page()).toBe(0));
  });

  it('prev does nothing on the first page and next does nothing on the last one', async () => {
    const c = await ready();
    reportsMock.getStudents.mockClear();
    c.prev();
    c.next();
    expect(reportsMock.getStudents).not.toHaveBeenCalled();
    expect(c.canPrev()).toBe(false);
    expect(c.canNext()).toBe(false);
  });

  it('has one page when there are no students', async () => {
    reportsMock.getStudents.mockResolvedValue({ students: [], total: 0 });
    const c = await ready();
    expect(c.totalPages()).toBe(1);
  });

  it('captures an error and clears the list', async () => {
    reportsMock.getStudents.mockRejectedValue(new Error('Sin conexión al servidor'));
    const c = await ready();
    expect(c.students()).toEqual([]);
    expect(c.total()).toBe(0);
    expect(c.loadError()).toBe('Sin conexión al servidor');
    expect(c.hasSearched()).toBe(true);
  });

  it('uses a generic message when loading fails with something that is not an Error', async () => {
    reportsMock.getStudents.mockRejectedValue('boom');
    const c = await ready();
    expect(c.loadError()).toBe('Error al cargar los estudiantes');
  });

  it('initials handles empty, single and multi-part names', async () => {
    const c = await ready();
    expect(c.initials('')).toBe('');
    expect(c.initials('ana')).toBe('AN');
    expect(c.initials('ana maria lopez')).toBe('AM');
    expect(c.initials('juan_perez')).toBe('JP');
  });

  it('classificationLabel is case-insensitive and keeps unknown values; levelColorOf follows the level', async () => {
    const c = await ready();
    expect(c.classificationLabel('BÁSICO')).toBe('Básico');
    expect(c.classificationLabel('otro')).toBe('otro');
    expect(c.levelColorOf('avanzado')).not.toBe(c.levelColorOf('básico'));
  });
});
