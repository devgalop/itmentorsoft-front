import { GuideRole, GuideStep } from './guide.types';

/**
 * Textos de la guía de uso de cada perfil. Los iconos son los del menú lateral
 * (`app-sidebar-icon`). Para cambiar un texto basta con editarlo aquí.
 */
export const GUIDE_STEPS: Record<GuideRole, GuideStep[]> = {
  student: [
    {
      icon: 'home',
      title: 'Te damos la bienvenida a ITMentorSoft',
      text: 'Es tu tutor inteligente de ingeniería de software: te evalúa, identifica en qué temas necesitas reforzar y te arma una ruta de estudio a tu medida.',
    },
    {
      icon: 'check',
      title: 'Empieza con tu evaluación',
      text: 'En Evaluaciones respondes unas preguntas con tus propias palabras. Una IA las califica y te avisamos cuando tu resultado esté listo, en pantalla y por correo. Mi ruta y Mi progreso se activan al terminar tu primera evaluación.',
      target: '/student/assessments',
    },
    {
      icon: 'chart',
      title: 'Tu resultado',
      text: 'Verás una nota de 0 a 5, tu nivel y comentarios para mejorar, con el detalle de cada una de tus respuestas. Tu historial queda guardado en Evaluaciones.',
      target: '/student/assessments',
    },
    {
      icon: 'route',
      title: 'Mi ruta',
      text: 'Recursos recomendados para cada tema que necesitas reforzar. Marca los que ya viste, califícalos con estrellas y, cuando completes tu ruta, puedes generar otra.',
      target: '/student/route',
    },
    {
      icon: 'chart',
      title: 'Mi progreso',
      text: 'Mira cómo avanzas en cada tema a lo largo de tus evaluaciones.',
      target: '/student/progress',
    },
    {
      icon: 'search',
      title: 'Explorar recursos',
      text: 'Busca recursos por tu cuenta, por tema o nivel. Y puedes repetir tus evaluaciones cuando quieras para ver cuánto mejoras.',
      target: '/student/explore',
    },
  ],
  teacher: [
    {
      icon: 'home',
      title: 'Te damos la bienvenida a ITMentorSoft',
      text: 'Desde tu perfil de docente creas las preguntas y los recursos con los que aprenden los estudiantes, y sigues su avance.',
    },
    {
      icon: 'book',
      title: 'Preguntas',
      text: 'Crea preguntas con su rúbrica (puntajes de 0 a 5). Cada pregunta nueva queda pendiente hasta que un administrador la apruebe; solo entonces se usa en las evaluaciones.',
      target: '/teacher/questions',
    },
    {
      icon: 'folder',
      title: 'Recursos',
      text: 'Agrega material de estudio asociado a temas y niveles, para que aparezca en las rutas de aprendizaje de los estudiantes.',
      target: '/teacher/resources',
    },
    {
      icon: 'chart',
      title: 'Reportes',
      text: 'Consulta cómo van tus estudiantes: su nivel, su avance por tema y sus evaluaciones.',
      target: '/teacher/reports',
    },
    {
      icon: 'home',
      title: 'Inicio',
      text: 'Tu panel resume la actividad (estudiantes por nivel, preguntas y recursos) y te da accesos rápidos para empezar.',
      target: '/teacher/dashboard',
    },
  ],
};
