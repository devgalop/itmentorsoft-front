import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { TeacherStudentsComponent } from './teacher-students.component';
import { ReportsService } from '../../../core/reports/reports.service';

describe('TeacherStudentsComponent', () => {
  let serviceMock: { getStudents: ReturnType<typeof vi.fn> };

  function student(id: string, name: string) {
    return { student_id: id, student_name: name, knowledge_classification: 'novice' };
  }

  function createComponent(): TeacherStudentsComponent {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [TeacherStudentsComponent, { provide: ReportsService, useValue: serviceMock }],
    });
    return TestBed.inject(TeacherStudentsComponent);
  }

  beforeEach(() => {
    serviceMock = { getStudents: vi.fn().mockResolvedValue({ students: [], total: 0 }) };
  });

  it('loads the first page of students on creation', async () => {
    serviceMock.getStudents.mockResolvedValue({ students: [student('s1', 'Eider Sánchez')], total: 1 });
    const component = createComponent();
    await Promise.resolve();
    await Promise.resolve();
    expect(serviceMock.getStudents).toHaveBeenCalledWith(0, 10);
    expect(component.students()).toHaveLength(1);
    expect(component.total()).toBe(1);
  });

  it('computes totalPages from total', async () => {
    serviceMock.getStudents.mockResolvedValue({ students: [student('s1', 'A')], total: 23 });
    const component = createComponent();
    await Promise.resolve();
    await Promise.resolve();
    expect(component.totalPages()).toBe(3);
  });

  it('nextPage loads the following page', async () => {
    serviceMock.getStudents.mockResolvedValue({ students: [student('s1', 'A')], total: 23 });
    const component = createComponent();
    await Promise.resolve();
    await Promise.resolve();
    await component.nextPage();
    expect(serviceMock.getStudents).toHaveBeenLastCalledWith(1, 10);
    expect(component.page()).toBe(1);
  });

  it('prevPage does nothing on the first page', async () => {
    const component = createComponent();
    await Promise.resolve();
    serviceMock.getStudents.mockClear();
    await component.prevPage();
    expect(serviceMock.getStudents).not.toHaveBeenCalled();
  });

  it('captures the error and clears the list on failure', async () => {
    serviceMock.getStudents.mockRejectedValue(new Error('No tenés permisos'));
    const component = createComponent();
    await Promise.resolve();
    await Promise.resolve();
    expect(component.students()).toEqual([]);
    expect(component.loadError()).toBe('No tenés permisos');
  });

  it('builds initials from the student name', () => {
    const component = createComponent();
    expect(component.initials('Eider Sánchez')).toBe('ES');
    expect(component.initials('Maria')).toBe('M');
  });
});
