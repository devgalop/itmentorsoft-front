import { NavItem } from '@shared/ui/sidebar/nav-item.model';

export const ADMIN_NAV_ITEMS: NavItem[] = [
  { label: 'Dashboard', route: '/admin/dashboard', icon: 'home', group: 'Principal' },
  { label: 'Usuarios', route: '/admin/users', icon: 'users', group: 'Principal' },
  { label: 'Aprobar pregunta', route: '/admin/content-approval', icon: 'check', group: 'Principal' },
  { label: 'Recursos', route: '/admin/resources', icon: 'folder', group: 'Principal' },
  { label: 'Configuración', route: '/admin/config', icon: 'settings', group: 'Sistema' },
  { label: 'Reportes', route: '/admin/reports', icon: 'chart', group: 'Sistema' },
];
