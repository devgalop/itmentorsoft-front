import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { RolesComponent } from './roles.component';
import { UsersService } from '../../../core/users/users.service';

describe('RolesComponent', () => {
  let usersMock: { getAvailableRoles: ReturnType<typeof vi.fn> };

  function createComponent(): RolesComponent {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [RolesComponent, { provide: UsersService, useValue: usersMock }],
    });
    return TestBed.inject(RolesComponent);
  }

  beforeEach(() => {
    usersMock = {
      getAvailableRoles: vi.fn().mockResolvedValue(['admin', 'teacher', 'student']),
    };
  });

  it('loads the available roles on creation', async () => {
    const c = createComponent();
    await Promise.resolve();
    await Promise.resolve();
    expect(usersMock.getAvailableRoles).toHaveBeenCalled();
    expect(c.availableRoles()).toEqual(['admin', 'teacher', 'student']);
    expect(c.isLoading()).toBe(false);
  });

  it('captures an error when roles fail to load', async () => {
    usersMock.getAvailableRoles.mockRejectedValue(new Error('No se pudieron cargar los roles'));
    const c = createComponent();
    await Promise.resolve();
    await Promise.resolve();
    expect(c.rolesError()).toBe('No se pudieron cargar los roles');
    expect(c.availableRoles()).toEqual([]);
  });

  it('maps role codes to readable labels', () => {
    const c = createComponent();
    expect(c.roleLabel('admin')).toBe('Administrador');
    expect(c.roleLabel('teacher')).toBe('Docente');
    expect(c.roleLabel('student')).toBe('Estudiante');
    expect(c.roleLabel('otro')).toBe('otro');
  });
});
