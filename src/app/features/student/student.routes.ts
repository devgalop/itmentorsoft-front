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
        path: 'route',
        data: { title: 'Mi ruta', subtitle: 'Próximamente: tu ruta de aprendizaje personalizada.' },
        loadComponent: PLACEHOLDER,
      },
      {
        path: 'progress',
        data: { title: 'Mi progreso', subtitle: 'Próximamente: métricas de tu avance.' },
        loadComponent: PLACEHOLDER,
      },
      {
        path: 'profile',
        data: { title: 'Mi perfil', subtitle: 'Próximamente: tu perfil y debilidades detectadas.' },
        loadComponent: PLACEHOLDER,
      },
      {
        path: 'assessments',
        data: { title: 'Evaluaciones', subtitle: 'Próximamente: tus evaluaciones diagnósticas.' },
        loadComponent: PLACEHOLDER,
      },
      {
        path: 'resources',
        data: { title: 'Recursos', subtitle: 'Próximamente: recursos de aprendizaje asignados.' },
        loadComponent: PLACEHOLDER,
      },
    ],
  },
];
