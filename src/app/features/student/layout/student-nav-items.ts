import { NavItem } from '@shared/ui/sidebar/nav-item.model';

export const STUDENT_NAV_ITEMS: NavItem[] = [
  { label: 'Principal', route: '/student/dashboard', icon: 'home', group: 'General' },
  { label: 'Mi ruta', route: '/student/route', icon: 'route', group: 'General' },
  { label: 'Explorar recursos', route: '/student/explore', icon: 'search', group: 'General' },
  { label: 'Mi progreso', route: '/student/progress', icon: 'chart', group: 'General' },
  { label: 'Evaluaciones', route: '/student/assessments', icon: 'check', group: 'Aprendizaje' },
];
