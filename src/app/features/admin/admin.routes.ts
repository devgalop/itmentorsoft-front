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
        loadComponent: () =>
          import('./config/admin-config.component').then((m) => m.AdminConfigComponent),
      },
      {
        path: 'analytics',
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
