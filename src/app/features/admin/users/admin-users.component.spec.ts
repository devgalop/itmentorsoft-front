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
});
