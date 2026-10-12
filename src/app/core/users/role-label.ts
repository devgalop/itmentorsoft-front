/** Nombre de cada rol tal como se muestra en la interfaz. */
const ROLE_LABELS: Record<string, string> = {
  admin: 'Administrador',
  teacher: 'Docente',
  student: 'Estudiante',
  user: 'Usuario Inicial',
};

export function roleLabel(role: string): string {
  return ROLE_LABELS[role.toLowerCase()] ?? role;
}
