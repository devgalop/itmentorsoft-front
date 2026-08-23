import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { vi } from 'vitest';
import { ProfileComponent } from './profile.component';
import { UsersService } from '../../core/users/users.service';
import { AuthService } from '../../core/auth/auth.service';

describe('ProfileComponent', () => {
  let usersMock: { getUser: ReturnType<typeof vi.fn> };
  let authMock: { userId: ReturnType<typeof vi.fn> };

  const user = { user_id: 'u1', username: 'student2', email: 's2@itm.co', role: 'student' };

  function createComponent(): ProfileComponent {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        ProfileComponent,
        provideRouter([]),
        { provide: UsersService, useValue: usersMock },
        { provide: AuthService, useValue: authMock },
      ],
    });
    return TestBed.inject(ProfileComponent);
  }

  beforeEach(() => {
    usersMock = { getUser: vi.fn().mockResolvedValue(user) };
    authMock = { userId: vi.fn().mockReturnValue('u1') };
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
});
