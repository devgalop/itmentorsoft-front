import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { InitialAssessmentService } from '@core/student/initial-assessment.service';

/**
 * Bloquea el acceso a módulos que requieren evaluación inicial (Mi ruta, Mi progreso).
 * Si el estudiante aún no se evaluó, redirige al dashboard.
 */
export const initialAssessmentGuard: CanActivateFn = async () => {
  const service = inject(InitialAssessmentService);
  const router = inject(Router);

  const completed = await service.hasCompleted();
  if (completed) return true;

  return router.createUrlTree(['/student/dashboard']);
};
