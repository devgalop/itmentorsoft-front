/**
 * Rutas (paths) de todos los endpoints del backend, centralizadas.
 *
 * Los paths son iguales en todos los ambientes; lo único que cambia por ambiente
 * es `environment.apiUrl` (el host). Por eso los paths viven acá y no dentro de
 * cada `environment.*.ts` (así no se duplican ni se desincronizan).
 *
 * Uso en un service:
 *   this.http.get(`${environment.apiUrl}${ENDPOINTS.assessments.topics}`)
 *   this.http.get(`${environment.apiUrl}${ENDPOINTS.users.byId(userId)}`)
 */
export const ENDPOINTS = {
  assessments: {
    root: '/assessments/',
    topics: '/assessments/topics',
    topic: '/assessments/topic',
    categories: '/assessments/categories',
    questions: '/assessments/questions',
    registerQuestion: '/assessments/questions/register',
    questionById: (id: string) => `/assessments/questions/${encodeURIComponent(id)}`,
    questionsByLevel: (difficulty: string) =>
      `/assessments/questions/level/${encodeURIComponent(difficulty)}`,
    questionsByCategory: (category: string) =>
      `/assessments/questions/category/${encodeURIComponent(category)}`,
    review: '/assessments/review',
    pendingApprovalQuestions: '/assessments/pending-approval-questions',
    qualificationStatus: '/assessments/qualification-status',
    assessmentResult: '/assessments/assessment_result',
    summary: '/assessments/summary',
  },
  content: {
    root: '/content/',
    byId: (id: string) => `/content/${encodeURIComponent(id)}`,
    recommendedLearningPaths: '/content/recommended/learning-paths',
  },
  reports: {
    students: '/reports/students',
    studentsByCategory: '/reports/students-by-category',
    studentProgress: '/reports/student_progress',
    studentSummary: '/reports/student_summary',
  },
  users: {
    root: '/users/',
    byId: (id: string) => `/users/${encodeURIComponent(id)}`,
    availableRoles: '/users/available-roles',
    assignRole: '/users/assign-role',
    createUserFromAdmin: '/users/create_user_from_admin',
    recoveryPassword: '/users/recovery-password',
    changePassword: '/users/change-password',
    sessions: '/users/sessions',
    refreshSession: '/users/sessions/refresh',
    connectedTotal: '/users/connected/total',
  },
} as const;
