import { Routes } from '@angular/router';

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
      // Roles se unió a Usuarios: se mantiene la ruta vieja para enlaces guardados.
      { path: 'roles', redirectTo: 'users', pathMatch: 'full' },
      {
        path: 'content-approval',
        loadComponent: () =>
          import('./approval/admin-approval.component').then((m) => m.AdminApprovalComponent),
      },
      {
        path: 'resources',
        loadComponent: () =>
          import('./resources/admin-resources.component').then((m) => m.AdminResourcesComponent),
      },
      {
        path: 'config',
        loadComponent: () =>
          import('./config/admin-config.component').then((m) => m.AdminConfigComponent),
      },
      // Analíticas pasó a llamarse Reportes: se mantiene la ruta vieja para enlaces guardados.
      { path: 'analytics', redirectTo: 'reports', pathMatch: 'full' },
      {
        path: 'reports',
        loadComponent: () =>
          import('./analytics/admin-analytics.component').then((m) => m.AdminAnalyticsComponent),
      },
      {
        path: 'profile',
        loadComponent: () =>
          import('@shared/profile/profile.component').then((m) => m.ProfileComponent),
      },
    ],
  },
];
