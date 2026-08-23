import { Routes } from '@angular/router';

const PLACEHOLDER = () =>
  import('./placeholder/student-placeholder.component').then(
    (m) => m.StudentPlaceholderComponent,
  );

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
        data: { title: 'Mi ruta', subtitle: 'Próximamente: tu ruta de aprendizaje personalizada.' },
        loadComponent: PLACEHOLDER,
      },
      {
        path: 'progress',
        loadComponent: () =>
          import('./progress/student-progress.component').then((m) => m.StudentProgressComponent),
      },
      {
        path: 'profile',
        loadComponent: () =>
          import('./progress/student-progress.component').then((m) => m.StudentProgressComponent),
      },
    ],
  },
];
