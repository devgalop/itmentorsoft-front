import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { AdminUsersComponent } from './admin-users.component';
import { UsersService } from '../../../core/users/users.service';
import { ToastService } from '../../../shared/ui/toast/toast.service';

describe('AdminUsersComponent', () => {
  const toastMock = { success: vi.fn(), error: vi.fn(), info: vi.fn(), warning: vi.fn() };
  afterEach(() => { toastMock.success.mockClear(); toastMock.error.mockClear(); });
  let serviceMock: {
    getAvailableRoles: ReturnType<typeof vi.fn>;
    createUser: ReturnType<typeof vi.fn>;
  };

  function createComponent(): AdminUsersComponent {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [AdminUsersComponent, { provide: UsersService, useValue: serviceMock }, { provide: ToastService, useValue: toastMock }],
    });
    return TestBed.inject(AdminUsersComponent);
  }

  beforeEach(() => {
    serviceMock = {
      getAvailableRoles: vi.fn().mockResolvedValue(['admin', 'teacher', 'student']),
      createUser: vi.fn(),
    };
  });

  function fillValid(component: AdminUsersComponent): void {
    component.form.patchValue({
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

    expect(toastMock.error).toHaveBeenCalledWith('No se pudo crear', 'Intentá nuevamente.');
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
    component.form.patchValue({ email: 'nuevo@itm.co', username: 'nuevo_user', role: 'teacher' });

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
      ['email', '', 'Requerido'],
      ['email', 'no-es-email', 'Email inválido'],
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
});
