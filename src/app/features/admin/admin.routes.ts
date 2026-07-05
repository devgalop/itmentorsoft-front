import { Routes } from '@angular/router';

const PLACEHOLDER = () =>
  import('./placeholder/admin-placeholder.component').then(
    (m) => m.AdminPlaceholderComponent,
  );

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
        data: { title: 'Usuarios', subtitle: 'Próximamente: gestión de usuarios del sistema.' },
        loadComponent: PLACEHOLDER,
      },
      {
        path: 'roles',
        loadComponent: () =>
          import('./roles/roles.component').then((m) => m.RolesComponent),
      },
      {
        path: 'content-approval',
        data: { title: 'Aprobar contenido', subtitle: 'Próximamente: aprobación de contenido y rúbricas.' },
        loadComponent: PLACEHOLDER,
      },
      {
        path: 'config',
        data: { title: 'Configuración', subtitle: 'Próximamente: configuración del sistema.' },
        loadComponent: PLACEHOLDER,
      },
      {
        path: 'analytics',
        data: { title: 'Analíticas', subtitle: 'Próximamente: analíticas y métricas globales.' },
        loadComponent: PLACEHOLDER,
      },
    ],
  },
];
