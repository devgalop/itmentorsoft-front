import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { vi } from 'vitest';
import { AdminDashboardComponent } from './admin-dashboard.component';
import { ReportsService } from '../../../core/reports/reports.service';
import { ContentService } from '../../../core/content/content.service';
import { UsersService } from '../../../core/users/users.service';
import { ApprovalService } from '../../../core/admin/approval.service';
import { AssessmentsService } from '../../../core/assessments/assessments.service';

describe('AdminDashboardComponent', () => {
  let fixture: ComponentFixture<AdminDashboardComponent>;
  let component: AdminDashboardComponent;
  let reportsMock: {
    getStudents: ReturnType<typeof vi.fn>;
    getCategorySummary: ReturnType<typeof vi.fn>;
    getUsersByRoleTotal: ReturnType<typeof vi.fn>;
  };
  let contentMock: { getAllContents: ReturnType<typeof vi.fn> };
  let usersMock: {
    getAvailableRoles: ReturnType<typeof vi.fn>;
    getConnectedTotal: ReturnType<typeof vi.fn>;
  };
  let approvalMock: { getPending: ReturnType<typeof vi.fn> };
  let assessmentsMock: { getModelSelected: ReturnType<typeof vi.fn> };

  function student(id: string) {
    return { student_id: id, student_name: 'Est ' + id, knowledge_classification: 'novice' };
  }

  async function setup(): Promise<void> {
    await TestBed.configureTestingModule({
      imports: [AdminDashboardComponent],
      providers: [
        provideRouter([]),
        { provide: ReportsService, useValue: reportsMock },
        { provide: ContentService, useValue: contentMock },
        { provide: UsersService, useValue: usersMock },
        { provide: ApprovalService, useValue: approvalMock },
        { provide: AssessmentsService, useValue: assessmentsMock },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(AdminDashboardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    for (let i = 0; i < 4; i++) await new Promise((r) => setTimeout(r));
    fixture.detectChanges();
  }

  beforeEach(() => {
    reportsMock = {
      getStudents: vi.fn().mockResolvedValue({
        students: [student('1'), student('2')],
        total: 2,
      }),
      getCategorySummary: vi.fn().mockImplementation((c: string) => Promise.resolve(c === 'básico' ? 2 : 0)),
      getUsersByRoleTotal: vi.fn().mockImplementation((r: string) => Promise.resolve(r === 'student' ? 2 : 1)),
    };
    contentMock = { getAllContents: vi.fn().mockResolvedValue([{}, {}, {}]) };
    assessmentsMock = {
      getModelSelected: vi.fn().mockResolvedValue([
        { process: 'qualifier', model_id: 'modelo_a' },
        { process: 'classifier', model_id: 'modelo_b' },
      ]),
    };
    usersMock = {
      getAvailableRoles: vi.fn().mockResolvedValue(['admin', 'teacher', 'student']),
      getConnectedTotal: vi.fn().mockResolvedValue(7),
    };
    approvalMock = { getPending: vi.fn().mockResolvedValue({ questions: [], total: 4 }) };
  });

  it('fills all five stat cards with real data', async () => {
    await setup();
    expect(component.studentsTotal()).toBe(2);
    expect(component.connectedTotal()).toBe(7);
    expect(component.rolesTotal()).toBe(3);
    expect(component.resourcesTotal()).toBe(3);
    expect(component.pendingTotal()).toBe(4);
  });

  it('keeps connected card null when its endpoint fails but loads the rest', async () => {
    usersMock.getConnectedTotal.mockRejectedValue(new Error('boom'));
    await setup();
    expect(component.connectedTotal()).toBeNull();
    expect(component.studentsTotal()).toBe(2);
    expect(component.rolesTotal()).toBe(3);
  });

  it('calls the pending endpoint with a minimal page', async () => {
    await setup();
    expect(approvalMock.getPending).toHaveBeenCalledWith(0, 1);
  });

  it('keeps a card null when its endpoint fails but loads the rest', async () => {
    approvalMock.getPending.mockRejectedValue(new Error('boom'));
    await setup();
    expect(component.pendingTotal()).toBeNull();
    expect(component.rolesTotal()).toBe(3);
    expect(component.resourcesTotal()).toBe(3);
    expect(component.studentsTotal()).toBe(2);
  });

  it('shows the AI model in use for each process', async () => {
    await setup();
    expect(component.modelsInUse()).toEqual([
      { label: 'Calificación de respuestas', model: 'modelo_a' },
      { label: 'Clasificación de estudiantes', model: 'modelo_b' },
    ]);
  });

  it('shows "no model" for a process without selection', async () => {
    assessmentsMock.getModelSelected.mockResolvedValue([{ process: 'qualifier', model_id: 'modelo_a' }]);
    await setup();
    expect(component.modelsInUse()?.[1]).toEqual({ label: 'Clasificación de estudiantes', model: null });
  });

  it('keeps the card empty when the models cannot be loaded', async () => {
    assessmentsMock.getModelSelected.mockRejectedValue(new Error('x'));
    await setup();
    expect(component.modelsInUse()).toBeNull();
    expect(component.isLoading()).toBe(false);
  });

  describe('gráficas', () => {
    it('shows the students by category, ordered from the lowest level', async () => {
      await setup();
      expect(component.levelItems().map((i) => [i.label, i.count])).toEqual([
        ['Principiante', 0],
        ['Básico', 2],
        ['Intermedio', 0],
        ['Avanzado', 0],
      ]);
      expect(component.classifiedTotal()).toBe(2);
    });

    it('shows the users by role', async () => {
      await setup();
      expect(component.roleItems().map((i) => [i.key, i.count])).toEqual([
        ['admin', 1],
        ['teacher', 1],
        ['student', 2],
      ]);
    });

    it('counts a failed query as zero without breaking the chart', async () => {
      reportsMock.getCategorySummary.mockRejectedValue(new Error('x'));
      await setup();
      expect(component.levelItems().every((i) => i.count === 0)).toBe(true);
    });

    it('keeps the role chart empty when the roles cannot be loaded', async () => {
      usersMock.getAvailableRoles.mockRejectedValue(new Error('x'));
      await setup();
      expect(component.roleItems()).toEqual([]);
      expect(fixture.nativeElement.textContent).toContain('No se pudo cargar la distribución de usuarios');
    });
  });

  describe('requiere tu atención', () => {
    const texts = () => component.attention().map((a) => a.text);

    it('warns about the questions pending approval with a link to review them', async () => {
      await setup();
      expect(texts()).toContain('4 preguntas pendientes de aprobación');
      expect(component.attention()[0]).toMatchObject({ route: '/admin/content-approval', action: 'Revisar' });
    });

    it('uses the singular for a single pending question', async () => {
      approvalMock.getPending.mockResolvedValue({ questions: [], total: 1 });
      await setup();
      expect(texts()).toContain('1 pregunta pendiente de aprobación');
    });

    it('warns about each AI process without a model', async () => {
      assessmentsMock.getModelSelected.mockResolvedValue([{ process: 'qualifier', model_id: 'modelo_a' }]);
      await setup();
      expect(texts().some((t) => t.includes('no tiene modelo asignado'))).toBe(true);
      expect(component.attention().find((a) => a.action === 'Configurar')?.route).toBe('/admin/config');
    });

    it('says everything is in order when there is nothing to review', async () => {
      approvalMock.getPending.mockResolvedValue({ questions: [], total: 0 });
      await setup();
      expect(component.attention()).toEqual([]);
      expect(fixture.nativeElement.textContent).toContain('Todo en orden');
    });

    it('notices when no student has a category yet', async () => {
      approvalMock.getPending.mockResolvedValue({ questions: [], total: 0 });
      reportsMock.getCategorySummary.mockResolvedValue(0);
      await setup();
      expect(texts()).toContain('Ningún estudiante tiene categoría todavía');
    });

    it('does not invent alerts when the data could not be loaded', async () => {
      approvalMock.getPending.mockRejectedValue(new Error('x'));
      assessmentsMock.getModelSelected.mockRejectedValue(new Error('x'));
      await setup();
      expect(component.attention()).toEqual([]);
    });
  });

  it('shows the number of pending questions in the quick action of the banner', async () => {
    await setup();
    expect(fixture.nativeElement.querySelector('.dash__count')?.textContent).toContain('4');
  });
});
