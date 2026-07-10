import { Routes } from '@angular/router';

const PLACEHOLDER = () =>
  import('./placeholder/teacher-placeholder.component').then(
    (m) => m.TeacherPlaceholderComponent,
  );

export const TEACHER_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./layout/teacher-layout.component').then((m) => m.TeacherLayoutComponent),
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      {
        path: 'dashboard',
        loadComponent: () =>
          import('./dashboard/teacher-dashboard.component').then(
            (m) => m.TeacherDashboardComponent,
          ),
      },
      {
        path: 'questions',
        loadComponent: () =>
          import('./questions/question-bank.component').then((m) => m.QuestionBankComponent),
      },
      {
        path: 'questions/new',
        loadComponent: () =>
          import('./questions/question-form.component').then((m) => m.QuestionFormComponent),
      },
      {
        path: 'questions/:id/edit',
        loadComponent: () =>
          import('./questions/question-form.component').then((m) => m.QuestionFormComponent),
      },
      {
        path: 'students',
        data: {
          title: 'Mis estudiantes',
          subtitle: 'Próximamente: listado y progreso de tus estudiantes.',
        },
        loadComponent: PLACEHOLDER,
      },
      {
        path: 'reports',
        data: {
          title: 'Reportes',
          subtitle: 'Próximamente: métricas y reportes de desempeño del grupo.',
        },
        loadComponent: PLACEHOLDER,
      },
      {
        path: 'resources',
        loadComponent: () =>
          import('./resources/resources.component').then((m) => m.ResourcesComponent),
      },
      {
        path: 'rubrics',
        data: {
          title: 'Rúbricas',
          subtitle: 'Próximamente: creación y gestión de rúbricas de evaluación.',
        },
        loadComponent: PLACEHOLDER,
      },
      {
        path: 'routes',
        data: {
          title: 'Rutas',
          subtitle: 'Próximamente: configuración de rutas de aprendizaje por categoría.',
        },
        loadComponent: PLACEHOLDER,
      },
    ],
  },
];
