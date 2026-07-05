import { NavItem } from '@shared/ui/sidebar/nav-item.model';

export const TEACHER_NAV_ITEMS: NavItem[] = [
  { label: 'Dashboard', route: '/teacher/dashboard', icon: 'home', group: 'Principal' },
  { label: 'Mis estudiantes', route: '/teacher/students', icon: 'users', group: 'Principal' },
  { label: 'Reportes', route: '/teacher/reports', icon: 'chart', group: 'Principal' },
  { label: 'Cuestionarios', route: '/teacher/questions', icon: 'book', group: 'Contenido' },
  { label: 'Recursos', route: '/teacher/resources', icon: 'folder', group: 'Contenido' },
  { label: 'Rúbricas', route: '/teacher/rubrics', icon: 'check', group: 'Contenido' },
  { label: 'Rutas', route: '/teacher/routes', icon: 'route', group: 'Contenido' },
];
