import { roleLabel } from './role-label';

describe('roleLabel', () => {
  it.each([
    ['admin', 'Administrador'],
    ['teacher', 'Docente'],
    ['student', 'Estudiante'],
    ['user', 'Invitado'],
  ])('translates %s', (role, label) => {
    expect(roleLabel(role)).toBe(label);
  });

  it('is case-insensitive', () => {
    expect(roleLabel('ADMIN')).toBe('Administrador');
  });

  it('returns an unknown role as it comes', () => {
    expect(roleLabel('auditor')).toBe('auditor');
  });
});
