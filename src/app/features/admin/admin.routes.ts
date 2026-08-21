import { Routes } from '@angular/router';

const PLACEHOLDER = () =>
  import('./placeholder/admin-placeholder.component').then((m) => m.AdminPlaceholderComponent);

export const ADMIN_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./layout/admin-layout.component').then((m) => m.AdminLayoutComponent),
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      {
        path: 'dashboard',
        loadComponent: () =>
          import('./dashboard/admin-dashboard.component').then((m) => m.AdminDashboardComponent),
      },
      {
        path: 'users',
        loadComponent: () =>
          import('./users/admin-users.component').then((m) => m.AdminUsersComponent),
      },
      {
        path: 'roles',
        loadComponent: () => import('./roles/roles.component').then((m) => m.RolesComponent),
      },
      {
        path: 'content-approval',
        loadComponent: () =>
          import('./approval/admin-approval.component').then((m) => m.AdminApprovalComponent),
      },
      {
        path: 'config',
        data: {
          title: 'Configuración',
          subtitle: 'Próximamente: parámetros generales del sistema.',
        },
        loadComponent: PLACEHOLDER,
      },
      {
        path: 'analytics',
        data: {
          title: 'Analíticas',
          subtitle: 'Próximamente: métricas y analíticas del sistema.',
        },
        loadComponent: PLACEHOLDER,
      },
    ],
  },
];
