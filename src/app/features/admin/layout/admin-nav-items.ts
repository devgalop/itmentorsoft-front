import { NavItem } from '@shared/ui/sidebar/nav-item.model';

export const ADMIN_NAV_ITEMS: NavItem[] = [
  { label: 'Dashboard', route: '/admin/dashboard', icon: 'home', group: 'Principal' },
  { label: 'Usuarios', route: '/admin/users', icon: 'users', group: 'Principal' },
  { label: 'Roles', route: '/admin/roles', icon: 'shield', group: 'Principal' },
  { label: 'Aprobar contenido', route: '/admin/content-approval', icon: 'check', group: 'Principal' },
  { label: 'Configuración', route: '/admin/config', icon: 'settings', group: 'Sistema' },
  { label: 'Analíticas', route: '/admin/analytics', icon: 'chart', group: 'Sistema' },
];
