import { NavItem } from '@shared/ui/sidebar/nav-item.model';

export const ADMIN_NAV_ITEMS: NavItem[] = [
  { label: 'Principal', route: '/admin/dashboard', icon: 'home', group: 'General' },
  { label: 'Usuarios', route: '/admin/users', icon: 'users', group: 'General' },
  { label: 'Aprobar pregunta', route: '/admin/content-approval', icon: 'check', group: 'General' },
  { label: 'Recursos', route: '/admin/resources', icon: 'folder', group: 'General' },
  { label: 'Configuración', route: '/admin/config', icon: 'settings', group: 'Sistema' },
  { label: 'Reportes', route: '/admin/reports', icon: 'chart', group: 'Sistema' },
];
