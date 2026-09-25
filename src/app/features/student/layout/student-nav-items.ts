import { NavItem } from '@shared/ui/sidebar/nav-item.model';

export const STUDENT_NAV_ITEMS: NavItem[] = [
  { label: 'Dashboard', route: '/student/dashboard', icon: 'home', group: 'Principal' },
  { label: 'Mi ruta', route: '/student/route', icon: 'route', group: 'Principal' },
  { label: 'Explorar recursos', route: '/student/explore', icon: 'search', group: 'Principal' },
  { label: 'Mi progreso', route: '/student/progress', icon: 'chart', group: 'Principal' },
  { label: 'Evaluaciones', route: '/student/assessments', icon: 'check', group: 'Aprendizaje' },
];
