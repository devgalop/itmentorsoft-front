import { Routes } from '@angular/router';

export const STUDENT_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./layout/student-layout.component').then((m) => m.StudentLayoutComponent),
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      {
        path: 'dashboard',
        loadComponent: () =>
          import('./dashboard/student-dashboard.component').then(
            (m) => m.StudentDashboardComponent,
          ),
      },
    ],
  },
];