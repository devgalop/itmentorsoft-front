/** Perfiles que tienen guía de uso. */
export type GuideRole = 'student' | 'teacher';

/** Un paso de la guía: un icono (de los del menú lateral), un título y un texto corto. */
export interface GuideStep {
  icon: string;
  title: string;
  text: string;
}
