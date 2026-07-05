import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { RolesComponent } from './roles.component';
import { UsersService } from '../../../core/users/users.service';

describe('RolesComponent', () => {
  let serviceMock: {
    getAvailableRoles: ReturnType<typeof vi.fn>;
    getUser: ReturnType<typeof vi.fn>;
    assignRole: ReturnType<typeof vi.fn>;
  };

  function createComponent(): RolesComponent {
    TestBed.configureTestingModule({
      providers: [RolesComponent, { provide: UsersService, useValue: serviceMock }],
    });
    return TestBed.inject(RolesComponent);
  }

  beforeEach(() => {
    serviceMock = {
      getAvailableRoles: vi.fn().mockResolvedValue(['admin', 'teacher', 'student']),
      getUser: vi.fn(),
      assignRole: vi.fn(),
    };
  });

  it('loads available roles on creation and preselects the first', async () => {
    const component = createComponent();
    await Promise.resolve();
    await Promise.resolve();
    expect(serviceMock.getAvailableRoles).toHaveBeenCalled();
    expect(component.availableRoles()).toEqual(['admin', 'teacher', 'student']);
    expect(component.selectedRole()).toBe('admin');
  });

  it('does not search with an invalid (too short) user id', async () => {
    const component = createComponent();
    component.userIdControl.setValue('ab');
    await component.searchUser();
    expect(serviceMock.getUser).not.toHaveBeenCalled();
    expect(component.getUserIdError()).toBe('Debe tener al menos 3 caracteres');
  });

  it('searches and stores the found user', async () => {
    const user = { user_id: 'abc-123', username: 'eider', email: 'e@itm.co', role: 'student' };
    serviceMock.getUser.mockResolvedValue(user);
    const component = createComponent();
    component.userIdControl.setValue('abc-123');

    await component.searchUser();

    expect(serviceMock.getUser).toHaveBeenCalledWith('abc-123');
    expect(component.foundUser()).toEqual(user);
  });

  it('sets a search error when the user is not found', async () => {
    serviceMock.getUser.mockResolvedValue(null);
    const component = createComponent();
    component.userIdControl.setValue('missing');

    await component.searchUser();

    expect(component.foundUser()).toBeNull();
    expect(component.searchError()).toBe('No se encontró un usuario con ese ID');
  });

  it('assigns the selected role and reflects it on the user', async () => {
    const user = { user_id: 'abc-123', username: 'eider', email: 'e@itm.co', role: 'student' };
    serviceMock.getUser.mockResolvedValue(user);
    serviceMock.assignRole.mockResolvedValue({ is_success: true, message: 'Role assigned successfully.' });
    const component = createComponent();
    await Promise.resolve();
    component.userIdControl.setValue('abc-123');
    await component.searchUser();
    component.onRoleChange('teacher');

    await component.assign();

    expect(serviceMock.assignRole).toHaveBeenCalledWith('abc-123', 'teacher');
    expect(component.assignSuccess()).toBe('Role assigned successfully.');
    expect(component.foundUser()?.role).toBe('teacher');
  });

  it('shows an error when assignRole responds is_success false', async () => {
    const user = { user_id: 'abc-123', username: 'eider', email: 'e@itm.co', role: 'student' };
    serviceMock.getUser.mockResolvedValue(user);
    serviceMock.assignRole.mockResolvedValue({ is_success: false, message: 'Rol inválido' });
    const component = createComponent();
    component.userIdControl.setValue('abc-123');
    await component.searchUser();

    await component.assign();

    expect(component.assignError()).toBe('Rol inválido');
    expect(component.assignSuccess()).toBeNull();
  });

  it('does not assign when no user has been found', async () => {
    const component = createComponent();
    await component.assign();
    expect(serviceMock.assignRole).not.toHaveBeenCalled();
  });
});
