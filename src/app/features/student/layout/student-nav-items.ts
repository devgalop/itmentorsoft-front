import { NavItem } from '@shared/ui/sidebar/nav-item.model';

export const STUDENT_NAV_ITEMS: NavItem[] = [
  { label: 'Dashboard', route: '/student/dashboard', icon: 'home', group: 'Principal' },
  { label: 'Mi ruta', route: '/student/route', icon: 'route', group: 'Principal' },
  { label: 'Mi progreso', route: '/student/progress', icon: 'chart', group: 'Principal' },
  { label: 'Mi perfil', route: '/student/profile', icon: 'user', group: 'Principal' },
  { label: 'Evaluaciones', route: '/student/assessments', icon: 'check', group: 'Aprendizaje' },
  { label: 'Recursos', route: '/student/resources', icon: 'folder', group: 'Aprendizaje' },
];
