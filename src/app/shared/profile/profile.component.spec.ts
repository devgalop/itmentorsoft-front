import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { vi } from 'vitest';
import { ProfileComponent } from './profile.component';
import { UsersService } from '../../core/users/users.service';
import { AuthService } from '../../core/auth/auth.service';
import { ToastService } from '../../shared/ui/toast/toast.service';

describe('ProfileComponent', () => {
  let usersMock: {
    getUser: ReturnType<typeof vi.fn>;
    updateProfile: ReturnType<typeof vi.fn>;
  };
  let authMock: { userId: ReturnType<typeof vi.fn> };
  let toastMock: { success: ReturnType<typeof vi.fn>; error: ReturnType<typeof vi.fn> };

  const user = {
    user_id: 'u1',
    username: 'student2',
    email: 's2@itm.co',
    name: 'Estudiante Dos',
    role: 'student',
  };

  function createComponent(): ProfileComponent {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        ProfileComponent,
        provideRouter([]),
        { provide: UsersService, useValue: usersMock },
        { provide: AuthService, useValue: authMock },
        { provide: ToastService, useValue: toastMock },
      ],
    });
    return TestBed.inject(ProfileComponent);
  }

  beforeEach(() => {
    usersMock = {
      getUser: vi.fn().mockResolvedValue(user),
      updateProfile: vi.fn().mockResolvedValue({ is_success: true, message: 'ok' }),
    };
    authMock = { userId: vi.fn().mockReturnValue('u1') };
    toastMock = { success: vi.fn(), error: vi.fn() };
  });

  it('loads the logged-in user profile', async () => {
    const c = createComponent();
    await Promise.resolve();
    await Promise.resolve();
    expect(usersMock.getUser).toHaveBeenCalledWith('u1');
    expect(c.user()?.email).toBe('s2@itm.co');
    expect(c.isLoading()).toBe(false);
  });

  it('shows an error when there is no userId', () => {
    authMock.userId.mockReturnValue(null);
    const c = createComponent();
    expect(usersMock.getUser).not.toHaveBeenCalled();
    expect(c.loadError()).toContain('identificar tu usuario');
  });

  it('shows an error when the user is not found', async () => {
    usersMock.getUser.mockResolvedValue(null);
    const c = createComponent();
    await Promise.resolve();
    await Promise.resolve();
    expect(c.loadError()).toContain('No se encontraron');
  });

  it('captures a thrown error', async () => {
    usersMock.getUser.mockRejectedValue(new Error('Sin conexión al servidor'));
    const c = createComponent();
    await Promise.resolve();
    await Promise.resolve();
    expect(c.loadError()).toBe('Sin conexión al servidor');
  });

  it('builds initials and translates the role', () => {
    const c = createComponent();
    expect(c.initials('default_teacher')).toBe('DT');
    expect(c.initials('student2')).toBe('ST');
    expect(c.roleLabel('teacher')).toBe('Docente');
    expect(c.roleLabel('admin')).toBe('Administrador');
  });

  it('startEdit prefills the form and enters edit mode', async () => {
    const c = createComponent();
    await Promise.resolve();
    c.startEdit();
    expect(c.isEditing()).toBe(true);
    expect(c.editForm.value).toEqual({ name: 'Estudiante Dos', username: 'student2' });
  });

  it('does not save when the form is invalid', async () => {
    const c = createComponent();
    await Promise.resolve();
    c.startEdit();
    c.editForm.setValue({ name: 'ab', username: '' }); // name corto, username vacío
    await c.save();
    expect(usersMock.updateProfile).not.toHaveBeenCalled();
  });

  it('saves the profile and updates the view on success', async () => {
    const c = createComponent();
    await Promise.resolve();
    c.startEdit();
    c.editForm.setValue({ name: 'Nombre Nuevo', username: 'nuevo_user' });
    await c.save();

    expect(usersMock.updateProfile).toHaveBeenCalledWith({
      user_id: 'u1',
      username: 'nuevo_user',
      name: 'Nombre Nuevo',
    });
    expect(c.user()?.name).toBe('Nombre Nuevo');
    expect(c.user()?.username).toBe('nuevo_user');
    expect(c.isEditing()).toBe(false);
    expect(toastMock.success).toHaveBeenCalled();
  });

  it('shows an error toast when saving fails', async () => {
    usersMock.updateProfile.mockRejectedValue(new Error('Sin conexión al servidor'));
    const c = createComponent();
    await Promise.resolve();
    c.startEdit();
    c.editForm.setValue({ name: 'Nombre Nuevo', username: 'nuevo_user' });
    await c.save();

    expect(toastMock.error).toHaveBeenCalledWith('No se pudo actualizar', 'Sin conexión al servidor');
    expect(c.isEditing()).toBe(true);
  });

  it('shows the backend message and stays in edit mode when the update is rejected', async () => {
    usersMock.updateProfile.mockResolvedValue({ is_success: false, message: 'Usuario en uso' });
    const c = createComponent();
    await Promise.resolve();
    c.startEdit();
    c.editForm.setValue({ name: 'Nombre Nuevo', username: 'nuevo_user' });
    await c.save();

    expect(toastMock.error).toHaveBeenCalledWith('No se pudo actualizar', 'Usuario en uso');
    expect(toastMock.success).not.toHaveBeenCalled();
    expect(c.isEditing()).toBe(true);
    expect(c.user()?.name).toBe('Estudiante Dos');
  });

  it('shows a generic message when saving throws something that is not an Error', async () => {
    usersMock.updateProfile.mockRejectedValue('boom');
    const c = createComponent();
    await Promise.resolve();
    c.startEdit();
    c.editForm.setValue({ name: 'Nombre Nuevo', username: 'nuevo_user' });
    await c.save();

    expect(toastMock.error).toHaveBeenCalledWith('No se pudo actualizar', 'Error inesperado');
  });

  it('re-enables the form and clears the saving flag after saving', async () => {
    const c = createComponent();
    await Promise.resolve();
    c.startEdit();
    c.editForm.setValue({ name: 'Nombre Nuevo', username: 'nuevo_user' });
    await c.save();

    expect(c.isSaving()).toBe(false);
    expect(c.editForm.enabled).toBe(true);
  });

  it('does not save when there is no loaded user', async () => {
    usersMock.getUser.mockResolvedValue(null);
    const c = createComponent();
    await Promise.resolve();
    await Promise.resolve();
    c.editForm.setValue({ name: 'Nombre Nuevo', username: 'nuevo_user' });
    await c.save();

    expect(usersMock.updateProfile).not.toHaveBeenCalled();
  });

  it('startEdit does nothing when there is no loaded user', async () => {
    usersMock.getUser.mockResolvedValue(null);
    const c = createComponent();
    await Promise.resolve();
    await Promise.resolve();
    c.startEdit();
    expect(c.isEditing()).toBe(false);
  });

  it('cancelEdit leaves edit mode', async () => {
    const c = createComponent();
    await Promise.resolve();
    c.startEdit();
    c.cancelEdit();
    expect(c.isEditing()).toBe(false);
  });

  it('uses a generic message when loading throws something that is not an Error', async () => {
    usersMock.getUser.mockRejectedValue('boom');
    const c = createComponent();
    await Promise.resolve();
    await Promise.resolve();
    expect(c.loadError()).toBe('Error al cargar tu perfil');
  });

  describe('error messages', () => {
    it('return null until the field is touched', async () => {
      const c = createComponent();
      expect(c.getNameError()).toBeNull();
      expect(c.getUsernameError()).toBeNull();
    });

    it.each([
      ['', 'El nombre es requerido'],
      ['ab', 'Mínimo 3 caracteres'],
      ['a'.repeat(101), 'Máximo 100 caracteres'],
    ])('getNameError for "%s"', (value, message) => {
      const c = createComponent();
      c.nameControl.setValue(value);
      c.nameControl.markAsTouched();
      expect(c.getNameError()).toBe(message);
    });

    it('getNameError returns null for a valid name', () => {
      const c = createComponent();
      c.nameControl.setValue('Nombre Válido');
      c.nameControl.markAsTouched();
      expect(c.getNameError()).toBeNull();
    });

    it.each([
      ['', 'El nombre de usuario es requerido'],
      ['ab', 'Mínimo 3 caracteres'],
      ['a'.repeat(21), 'Máximo 20 caracteres'],
      ['user-name!', 'Solo letras, números y guion bajo'],
    ])('getUsernameError for "%s"', (value, message) => {
      const c = createComponent();
      c.usernameControl.setValue(value);
      c.usernameControl.markAsTouched();
      expect(c.getUsernameError()).toBe(message);
    });

    it('getUsernameError returns null for a valid username', () => {
      const c = createComponent();
      c.usernameControl.setValue('user_name');
      c.usernameControl.markAsTouched();
      expect(c.getUsernameError()).toBeNull();
    });
  });

  describe('helpers', () => {
    it('initials handles empty, single and multi-part names', () => {
      const c = createComponent();
      expect(c.initials('')).toBe('');
      expect(c.initials('   ')).toBe('');
      expect(c.initials('ana')).toBe('AN');
      expect(c.initials('Ana María López')).toBe('AM');
    });

    it('roleLabel translates student and keeps unknown roles as they come', () => {
      const c = createComponent();
      expect(c.roleLabel('student')).toBe('Estudiante');
      expect(c.roleLabel('auditor')).toBe('auditor');
    });
  });
});
