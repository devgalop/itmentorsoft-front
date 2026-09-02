import { Routes } from '@angular/router';
import { initialAssessmentGuard } from '@core/guards/initial-assessment.guard';

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
      {
        path: 'assessments',
        loadComponent: () =>
          import('./assessment/student-assessment.component').then(
            (m) => m.StudentAssessmentComponent,
          ),
      },
      {
        path: 'route',
        canActivate: [initialAssessmentGuard],
        loadComponent: () =>
          import('./route/student-route.component').then((m) => m.StudentRouteComponent),
      },
      {
        path: 'progress',
        canActivate: [initialAssessmentGuard],
        loadComponent: () =>
          import('./progress/student-progress.component').then((m) => m.StudentProgressComponent),
      },
      {
        path: 'profile',
        loadComponent: () =>
          import('@shared/profile/profile.component').then((m) => m.ProfileComponent),
      },
    ],
  },
];
