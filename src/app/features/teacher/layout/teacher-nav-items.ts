import { NavItem } from '@shared/ui/sidebar/nav-item.model';

export const TEACHER_NAV_ITEMS: NavItem[] = [
  { label: 'Principal', route: '/teacher/dashboard', icon: 'home', group: 'General' },
  { label: 'Reportes', route: '/teacher/reports', icon: 'chart', group: 'General' },
  { label: 'Preguntas', route: '/teacher/questions', icon: 'book', group: 'General' },
  { label: 'Recursos', route: '/teacher/resources', icon: 'folder', group: 'General' },
];
