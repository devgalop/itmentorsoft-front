/** Perfiles que tienen guía de uso. */
export type GuideRole = 'student' | 'teacher';

/** Un paso de la guía: un icono (de los del menú lateral), un título y un texto corto. */
export interface GuideStep {
  icon: string;
  title: string;
  text: string;
  /**
   * Ruta de la opción del menú lateral que explica este paso (por ejemplo "/student/route").
   * Si está, la guía resalta esa opción; si la opción no está (p. ej. Mi ruta antes de la primera
   * evaluación), el paso se muestra igual, sin resaltar.
   */
  target?: string;
}
