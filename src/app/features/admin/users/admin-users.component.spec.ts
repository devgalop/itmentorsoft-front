import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import { vi } from 'vitest';
import { AdminUsersComponent } from './admin-users.component';
import { UsersService } from '../../../core/users/users.service';
import { ReportsService } from '../../../core/reports/reports.service';
import { AuthService } from '../../../core/auth/auth.service';
import { ToastService } from '../../../shared/ui/toast/toast.service';

describe('AdminUsersComponent', () => {
  const toastMock = { success: vi.fn(), error: vi.fn(), info: vi.fn(), warning: vi.fn() };
  afterEach(() => { toastMock.success.mockClear(); toastMock.error.mockClear(); });
  let serviceMock: {
    getAvailableRoles: ReturnType<typeof vi.fn>;
    createUser: ReturnType<typeof vi.fn>;
    getUser: ReturnType<typeof vi.fn>;
    updateUserStatus: ReturnType<typeof vi.fn>;
  };
  let reportsMock: { getUsersByRole: ReturnType<typeof vi.fn> };
  let authMock: { userId: ReturnType<typeof vi.fn> };
  let routerMock: { navigate: ReturnType<typeof vi.fn> };
  let queryParams: Record<string, string> = {};

  function createComponent(): AdminUsersComponent {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        AdminUsersComponent,
        { provide: ActivatedRoute, useValue: { snapshot: { queryParamMap: convertToParamMap(queryParams) } } },
        { provide: Router, useValue: routerMock },
        { provide: UsersService, useValue: serviceMock },
        { provide: ReportsService, useValue: reportsMock },
        { provide: AuthService, useValue: authMock },
        { provide: ToastService, useValue: toastMock },
      ],
    });
    return TestBed.inject(AdminUsersComponent);
  }

  beforeEach(() => {
    serviceMock = {
      getAvailableRoles: vi.fn().mockResolvedValue(['admin', 'teacher', 'student']),
      createUser: vi.fn(),
      getUser: vi.fn().mockImplementation(async (id: string) => ({
        user_id: id,
        username: 'user_' + id,
        email: id + '@itm.co',
        name: 'Nombre ' + id,
        role: 'admin',
      })),
      updateUserStatus: vi.fn().mockResolvedValue({ is_success: true, message: 'ok' }),
    };
    reportsMock = {
      getUsersByRole: vi.fn().mockResolvedValue([
        { user_id: 'u1', role: 'admin' },
        { user_id: 'u2', role: 'admin' },
      ]),
    };
    authMock = { userId: vi.fn().mockReturnValue('me') };
    routerMock = { navigate: vi.fn().mockResolvedValue(true) };
    queryParams = {};
  });

  function fillValid(component: AdminUsersComponent): void {
    component.form.patchValue({
      name: 'Docente Nuevo',
      email: 'nuevo@itm.co',
      username: 'nuevo_user',
      role: 'teacher',
    });
  }

  it('loads roles on creation and preselects the first', async () => {
    const component = createComponent();
    await Promise.resolve();
    await Promise.resolve();
    expect(serviceMock.getAvailableRoles).toHaveBeenCalled();
    expect(component.roles()).toEqual(['admin', 'teacher', 'student']);
    expect(component.form.get('role')?.value).toBe('admin');
  });

  it('is invalid while required fields are empty', () => {
    const component = createComponent();
    expect(component.form.valid).toBe(false);
  });

  it('rejects an invalid email', () => {
    const component = createComponent();
    fillValid(component);
    component.form.get('email')?.setValue('no-es-email');
    expect(component.form.get('email')?.valid).toBe(false);
  });

  it('rejects a username with invalid characters', () => {
    const component = createComponent();
    fillValid(component);
    component.form.get('username')?.setValue('mal usuario!');
    expect(component.form.get('username')?.valid).toBe(false);
  });

  it('does not submit when invalid', async () => {
    const component = createComponent();
    await component.submit();
    expect(serviceMock.createUser).not.toHaveBeenCalled();
  });

  it('creates the user and shows success, then resets', async () => {
    serviceMock.createUser.mockResolvedValue({ is_success: true, message: 'Usuario creado', user_id: 'u1' });
    const component = createComponent();
    await Promise.resolve();
    fillValid(component);

    await component.submit();

    expect(serviceMock.createUser).toHaveBeenCalledTimes(1);
    expect(serviceMock.createUser.mock.calls[0][0]).toEqual({
      name: 'Docente Nuevo',
      email: 'nuevo@itm.co',
      username: 'nuevo_user',
      role: 'teacher',
    });
    expect(toastMock.success).toHaveBeenCalledWith('Usuario creado', expect.any(String));
    expect(component.form.get('email')?.value).toBe('');
  });

  it('shows an error when the backend responds is_success false', async () => {
    serviceMock.createUser.mockResolvedValue({ is_success: false, message: 'Email ya existe' });
    const component = createComponent();
    await Promise.resolve();
    fillValid(component);

    await component.submit();

    expect(toastMock.error).toHaveBeenCalledWith('No se pudo crear', 'Email ya existe');
  });

  it('shows an error when the service throws', async () => {
    serviceMock.createUser.mockRejectedValue(new Error('Datos inválidos'));
    const component = createComponent();
    await Promise.resolve();
    fillValid(component);

    await component.submit();

    expect(toastMock.error).toHaveBeenCalledWith('Error al crear usuario', 'Datos inválidos');
  });

  it('uses a default message when the backend rejects without one', async () => {
    serviceMock.createUser.mockResolvedValue({ is_success: false, message: '' });
    const component = createComponent();
    await Promise.resolve();
    fillValid(component);

    await component.submit();

    expect(toastMock.error).toHaveBeenCalledWith('No se pudo crear', 'Intenta nuevamente.');
  });

  it('uses a generic message when the service throws something that is not an Error', async () => {
    serviceMock.createUser.mockRejectedValue('boom');
    const component = createComponent();
    await Promise.resolve();
    fillValid(component);

    await component.submit();

    expect(toastMock.error).toHaveBeenCalledWith('Error al crear usuario', 'Error inesperado');
  });

  it('marks every field as touched when submitting an invalid form', async () => {
    const component = createComponent();
    await component.submit();
    expect(component.form.get('email')?.touched).toBe(true);
    expect(component.form.get('username')?.touched).toBe(true);
  });

  it('clears the submitting flag after a submit', async () => {
    serviceMock.createUser.mockResolvedValue({ is_success: true, message: 'ok' });
    const component = createComponent();
    await Promise.resolve();
    fillValid(component);

    await component.submit();

    expect(component.isSubmitting()).toBe(false);
  });

  it('keeps the form usable when loading roles fails', async () => {
    serviceMock.getAvailableRoles.mockRejectedValue(new Error('boom'));
    const component = createComponent();
    await Promise.resolve();
    await Promise.resolve();
    expect(component.roles()).toEqual([]);
    expect(component.isLoadingRoles()).toBe(false);
    expect(component.form.get('role')?.value).toBe('');
  });

  it('does not preselect a role when the list is empty', async () => {
    serviceMock.getAvailableRoles.mockResolvedValue([]);
    const component = createComponent();
    await Promise.resolve();
    await Promise.resolve();
    expect(component.form.get('role')?.value).toBe('');
  });

  it('resets to an empty role when there are no roles after a successful create', async () => {
    serviceMock.getAvailableRoles.mockResolvedValue([]);
    serviceMock.createUser.mockResolvedValue({ is_success: true, message: 'ok' });
    const component = createComponent();
    await Promise.resolve();
    await Promise.resolve();
    component.form.patchValue({ name: 'Docente Nuevo', email: 'nuevo@itm.co', username: 'nuevo_user', role: 'teacher' });

    await component.submit();

    expect(component.form.get('role')?.value).toBe('');
  });

  describe('fieldError', () => {
    it('returns null when there is no control', () => {
      const component = createComponent();
      expect(component.fieldError(null)).toBeNull();
    });

    it('returns null until the control is touched', () => {
      const component = createComponent();
      expect(component.fieldError(component.form.get('email'))).toBeNull();
    });

    it('returns null for a touched control without errors', () => {
      const component = createComponent();
      const ctrl = component.form.get('email')!;
      ctrl.setValue('valido@itm.co');
      ctrl.markAsTouched();
      expect(component.fieldError(ctrl)).toBeNull();
    });

    it.each([
      ['name', '', 'Requerido'],
      ['name', 'ab', 'Mínimo 3 caracteres'],
      ['name', 'a'.repeat(101), 'Máximo 100 caracteres'],
      ['email', '', 'Requerido'],
      ['email', 'no-es-email', 'Correo electrónico inválido'],
      ['email', 'a@b', 'Mínimo 5 caracteres'],
      ['username', 'ab', 'Mínimo 3 caracteres'],
      ['username', 'a'.repeat(21), 'Máximo 20 caracteres'],
      ['username', 'mal usuario!', 'Solo letras, números y guion bajo'],
    ])('maps %s="%s" to "%s"', (field, value, message) => {
      const component = createComponent();
      const ctrl = component.form.get(field)!;
      ctrl.setValue(value);
      ctrl.markAsTouched();
      expect(component.fieldError(ctrl)).toBe(message);
    });

    it('maps a maxlength error to the max-length message', () => {
      const component = createComponent();
      const ctrl = component.form.get('email')!;
      // El validador de email de Angular ya rechaza > 254 caracteres, por lo que
      // esta rama no se alcanza con un valor real: se fuerza el error.
      ctrl.setErrors({ maxlength: { requiredLength: 255, actualLength: 300 } });
      ctrl.markAsTouched();
      expect(component.fieldError(ctrl)).toBe('Máximo 255 caracteres');
    });

    it('returns a generic message for an unknown error', () => {
      const component = createComponent();
      const ctrl = component.form.get('role')!;
      ctrl.setValue('x');
      ctrl.setErrors({ custom: true });
      ctrl.markAsTouched();
      expect(component.fieldError(ctrl)).toBe('Inválido');
    });
  });
  describe('create user from the dashboard link', () => {
    it('opens the modal and clears the parameter when the URL has ?crear=1', async () => {
      queryParams = { crear: '1' };
      const component = createComponent();
      expect(component.isCreateOpen()).toBe(true);
      expect(routerMock.navigate).toHaveBeenCalledWith(
        [],
        expect.objectContaining({ queryParams: { crear: null }, replaceUrl: true }),
      );
      // el rol por defecto se completa cuando llegan los roles
      await vi.waitFor(() => expect(component.form.get('role')?.value).toBe('admin'));
    });

    it('does not open the modal on a normal visit', () => {
      const component = createComponent();
      expect(component.isCreateOpen()).toBe(false);
      expect(routerMock.navigate).not.toHaveBeenCalled();
    });
  });

  describe('create user modal', () => {
    it('is closed at the start and opens with the current role selected', async () => {
      const component = createComponent();
      await vi.waitFor(() => expect(component.manageRole()).toBe('admin'));
      expect(component.isCreateOpen()).toBe(false);
      component.onManageRoleChange('student');
      await vi.waitFor(() => expect(component.manageRole()).toBe('student'));

      component.openCreate();

      expect(component.isCreateOpen()).toBe(true);
      expect(component.form.get('role')?.value).toBe('student');
      expect(component.form.get('email')?.value).toBe('');
    });

    it('closes with closeCreate and with Escape', async () => {
      const component = createComponent();
      component.openCreate();
      component.closeCreate();
      expect(component.isCreateOpen()).toBe(false);
      component.openCreate();
      component.onEscape();
      expect(component.isCreateOpen()).toBe(false);
    });

    it('cannot be closed while the user is being created', async () => {
      const component = createComponent();
      await vi.waitFor(() => expect(component.roles()).toHaveLength(3));
      let release!: (v: unknown) => void;
      serviceMock.createUser.mockReturnValue(new Promise((r) => (release = r)));
      component.openCreate();
      fillValid(component);

      const pending = component.submit();
      component.closeCreate();
      component.onEscape();
      expect(component.isCreateOpen()).toBe(true);

      release({ is_success: true, message: 'ok' });
      await pending;
      expect(component.isCreateOpen()).toBe(false);
    });

    it('closes the modal and shows the role of the new user after creating it', async () => {
      serviceMock.createUser.mockResolvedValue({ is_success: true, message: 'ok', user_id: 'u9' });
      const component = createComponent();
      await vi.waitFor(() => expect(component.roles()).toHaveLength(3));
      component.openCreate();
      fillValid(component);

      await component.submit();

      expect(component.isCreateOpen()).toBe(false);
      await vi.waitFor(() => expect(reportsMock.getUsersByRole).toHaveBeenLastCalledWith('teacher'));
      expect(component.manageRole()).toBe('teacher');
    });

    it('keeps the modal open when the creation fails', async () => {
      serviceMock.createUser.mockResolvedValue({ is_success: false, message: 'Correo ya existe' });
      const component = createComponent();
      await vi.waitFor(() => expect(component.roles()).toHaveLength(3));
      component.openCreate();
      fillValid(component);

      await component.submit();

      expect(component.isCreateOpen()).toBe(true);
    });
  });

  describe('user status management', () => {
    async function ready(): Promise<AdminUsersComponent> {
      const component = createComponent();
      await vi.waitFor(() => {
        expect(reportsMock.getUsersByRole).toHaveBeenCalled();
        expect(component.isLoadingManaged()).toBe(false);
      });
      return component;
    }

    it('loads the users of the first role with their details', async () => {
      const component = await ready();
      expect(reportsMock.getUsersByRole).toHaveBeenCalledWith('admin');
      expect(component.manageRole()).toBe('admin');
      expect(component.managedUsers()).toEqual([
        { user_id: 'u1', name: 'Nombre u1', username: 'user_u1', email: 'u1@itm.co', role: 'admin', status: null },
        { user_id: 'u2', name: 'Nombre u2', username: 'user_u2', email: 'u2@itm.co', role: 'admin', status: null },
      ]);
    });

    it('takes the status from the report when the backend sends it', async () => {
      reportsMock.getUsersByRole.mockResolvedValue([
        { user_id: 'u1', role: 'admin', status: 'inactive' },
        { user_id: 'u2', role: 'admin', status: 'active' },
        { user_id: 'u3', role: 'admin', status: 'raro' },
      ]);
      const component = await ready();
      expect(component.managedUsers().map((u) => u.status)).toEqual(['inactive', 'active', null]);
    });

    it('takes the status from the user detail, which is where the backend sends it', async () => {
      reportsMock.getUsersByRole.mockResolvedValue([
        { user_id: 'u1', role: 'admin' },
        { user_id: 'u2', role: 'admin' },
        { user_id: 'u3', role: 'admin' },
      ]);
      const statuses: Record<string, string> = { u1: 'suspended', u2: 'active', u3: 'desconocido' };
      serviceMock.getUser.mockImplementation(async (id: string) => ({
        user_id: id,
        username: 'user_' + id,
        email: id + '@itm.co',
        name: 'Nombre ' + id,
        role: 'admin',
        status: statuses[id],
      }));
      const component = await ready();
      expect(component.managedUsers().map((u) => u.status)).toEqual(['suspended', 'active', null]);
    });

    it('prefers the status of the detail over the one in the report', async () => {
      reportsMock.getUsersByRole.mockResolvedValue([{ user_id: 'u1', role: 'admin', status: 'inactive' }]);
      serviceMock.getUser.mockResolvedValue({
        user_id: 'u1',
        username: 'user_u1',
        email: 'u1@itm.co',
        name: 'Nombre u1',
        role: 'admin',
        status: 'active',
      });
      const component = await ready();
      expect(component.managedUsers()[0]!.status).toBe('active');
    });

    it('falls back to the report status when the detail cannot be loaded', async () => {
      reportsMock.getUsersByRole.mockResolvedValue([{ user_id: 'u1', role: 'admin', status: 'inactive' }]);
      serviceMock.getUser.mockRejectedValue(new Error('x'));
      const component = await ready();
      expect(component.managedUsers()[0]!.status).toBe('inactive');
    });

    it('offers Inactivar and Suspender when the status is active or unknown', async () => {
      const component = await ready();
      const unknown = { ...component.managedUsers()[0]!, status: null };
      const active = { ...unknown, status: 'active' as const };
      expect(component.actionsFor(unknown).map((a) => a.value)).toEqual(['inactive', 'suspended']);
      expect(component.actionsFor(active).map((a) => a.value)).toEqual(['inactive', 'suspended']);
    });

    it('offers only Activar when the user is known to be inactive or suspended', async () => {
      const component = await ready();
      const base = component.managedUsers()[0]!;
      expect(component.actionsFor({ ...base, status: 'inactive' }).map((a) => a.value)).toEqual(['active']);
      expect(component.actionsFor({ ...base, status: 'suspended' }).map((a) => a.value)).toEqual(['active']);
    });

    it('labels statuses and roles in Spanish', async () => {
      const component = await ready();
      expect(component.statusLabel('active')).toBe('Activo');
      expect(component.statusLabel('inactive')).toBe('Inactivo');
      expect(component.statusLabel('suspended')).toBe('Suspendido');
      expect(component.statusLabel(null)).toBe('—');
      expect(component.roleLabel('teacher')).toBe('Docente');
    });

    it('keeps a user in the list when its detail cannot be loaded', async () => {
      serviceMock.getUser.mockRejectedValueOnce(new Error('x'));
      const component = await ready();
      expect(component.managedUsers()).toHaveLength(2);
      expect(component.managedUsers()[0]).toMatchObject({ user_id: 'u1', name: '(sin datos)' });
    });

    it('reloads when the role changes', async () => {
      const component = await ready();
      component.onManageRoleChange('teacher');
      await vi.waitFor(() => expect(reportsMock.getUsersByRole).toHaveBeenLastCalledWith('teacher'));
      expect(component.manageRole()).toBe('teacher');
    });

    it('shows a message when the role has no users (backend error)', async () => {
      reportsMock.getUsersByRole.mockRejectedValue(new Error('x'));
      const component = await ready();
      expect(component.managedUsers()).toEqual([]);
      expect(component.manageError()).toContain('No hay usuarios con este rol');
    });

    it('does not let the admin change their own status', async () => {
      authMock.userId.mockReturnValue('u1');
      const component = await ready();
      const me = component.managedUsers()[0]!;
      expect(component.isSelf('u1')).toBe(true);
      component.askStatusChange(me, 'inactive');
      expect(component.pendingChange()).toBeNull();
    });

    it('asks for confirmation before calling the backend and can cancel', async () => {
      const component = await ready();
      const user = component.managedUsers()[0]!;
      component.askStatusChange(user, 'suspended');
      expect(component.pendingChange()).toEqual({ user, status: 'suspended' });
      expect(component.pendingLabel()).toBe('suspendido');
      component.cancelStatusChange();
      expect(component.pendingChange()).toBeNull();
      expect(serviceMock.updateUserStatus).not.toHaveBeenCalled();
    });

    it('Escape closes the modal', async () => {
      const component = await ready();
      component.askStatusChange(component.managedUsers()[0]!, 'inactive');
      component.onEscape();
      expect(component.pendingChange()).toBeNull();
    });

    it('applies the change, notifies and keeps the user in the table with the new status', async () => {
      const component = await ready();
      const user = component.managedUsers()[0]!;
      component.askStatusChange(user, 'inactive');

      await component.confirmStatusChange();

      expect(serviceMock.updateUserStatus).toHaveBeenCalledWith('u1', 'inactive');
      expect(toastMock.success).toHaveBeenCalledWith('Estado actualizado', 'Nombre u1 ahora está inactivo.');
      expect(component.pendingChange()).toBeNull();
      expect(component.managedUsers().map((u) => u.user_id)).toEqual(['u1', 'u2']);
      expect(component.managedUsers()[0]!.status).toBe('inactive');
      expect(component.managedUsers()[1]!.status).toBeNull();
      expect(component.isChangingStatus()).toBe(false);
    });

    it('can activate a user that was inactive', async () => {
      reportsMock.getUsersByRole.mockResolvedValue([{ user_id: 'u1', role: 'admin', status: 'inactive' }]);
      const component = await ready();
      component.askStatusChange(component.managedUsers()[0]!, 'active');

      await component.confirmStatusChange();

      expect(serviceMock.updateUserStatus).toHaveBeenCalledWith('u1', 'active');
      expect(toastMock.success).toHaveBeenCalledWith('Estado actualizado', 'Nombre u1 ahora está activo.');
      expect(component.managedUsers()[0]!.status).toBe('active');
    });

    it('shows an error and keeps the user when the backend rejects the change', async () => {
      serviceMock.updateUserStatus.mockRejectedValue(new Error('No tienes permisos para esta acción'));
      const component = await ready();
      component.askStatusChange(component.managedUsers()[0]!, 'inactive');

      await component.confirmStatusChange();

      expect(toastMock.error).toHaveBeenCalledWith(
        'No se pudo cambiar el estado',
        'No tienes permisos para esta acción',
      );
      expect(component.managedUsers()).toHaveLength(2);
      expect(component.isChangingStatus()).toBe(false);
    });

    it('treats is_success false as an error', async () => {
      serviceMock.updateUserStatus.mockResolvedValue({ is_success: false, message: 'Estado inválido' });
      const component = await ready();
      component.askStatusChange(component.managedUsers()[0]!, 'inactive');

      await component.confirmStatusChange();

      expect(toastMock.error).toHaveBeenCalledWith('No se pudo cambiar el estado', 'Estado inválido');
      expect(toastMock.success).not.toHaveBeenCalled();
    });

    it('cannot cancel while the change is being applied', async () => {
      const component = await ready();
      let release!: (v: unknown) => void;
      serviceMock.updateUserStatus.mockReturnValue(new Promise((r) => (release = r)));
      component.askStatusChange(component.managedUsers()[0]!, 'inactive');

      const pending = component.confirmStatusChange();
      component.cancelStatusChange();
      expect(component.pendingChange()).not.toBeNull();

      release({ is_success: true, message: 'ok' });
      await pending;
      expect(component.pendingChange()).toBeNull();
    });
  });
});
