import { Routes } from '@angular/router';

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
        loadComponent: () =>
          import('./students/teacher-students.component').then((m) => m.TeacherStudentsComponent),
      },
      {
        path: 'students/:id',
        loadComponent: () =>
          import('./students/student-detail.component').then((m) => m.StudentDetailComponent),
      },
      {
        path: 'reports',
        loadComponent: () =>
          import('./reports/teacher-reports.component').then((m) => m.TeacherReportsComponent),
      },
      {
        path: 'resources',
        loadComponent: () =>
          import('./resources/resources.component').then((m) => m.ResourcesComponent),
      },
      {
        path: 'profile',
        loadComponent: () =>
          import('@shared/profile/profile.component').then((m) => m.ProfileComponent),
      },
    ],
  },
];
