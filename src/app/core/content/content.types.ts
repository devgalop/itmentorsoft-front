export type ContentCategory = 'principiante' | 'básico' | 'intermedio' | 'avanzado';

export const CONTENT_CATEGORIES: ContentCategory[] = [
  'principiante',
  'básico',
  'intermedio',
  'avanzado',
];

/** Etiqueta legible para mostrar en la UI (capitalizada). */
export const CONTENT_CATEGORY_LABELS: Record<string, string> = {
  principiante: 'Principiante',
  básico: 'Básico',
  intermedio: 'Intermedio',
  avanzado: 'Avanzado',
};

export function contentCategoryLabel(value: string): string {
  return CONTENT_CATEGORY_LABELS[value] ?? value;
}

export interface ContentItem {
  content_id: string;
  title: string;
  summary: string;
  url: string;
  category: string;
  related_topics: string[];
}

export interface GetAllContentsResponse {
  is_success: boolean;
  message: string;
  items: ContentItem[];
  total: number;
}

/** Contenido recomendado dentro de un tema, para "Mi ruta". */
export interface RecommendedContent {
  content_id: string;
  title: string;
  description: string;
  rating: number;
}

/** Un tema de la ruta: su id (para consultarlo) y su nombre. */
export interface TopicPathRef {
  topic_path_id: string;
  topic: string;
}

/** Tema con su lista de contenidos recomendados. */
export interface RecommendedTopic {
  topic: string;
  contents: RecommendedContent[];
  /** Id del tema dentro de la ruta. */
  topic_path_id?: string;
  /** Avance de 0 a 100. */
  progress?: number;
}

/** Respuesta de GET /content/recommended/learning-paths?path_id=: un solo tema. */
export interface GetRecommendedLearningPathsResponse {
  is_success: boolean;
  message: string;
  recommendation: RecommendedTopic | null;
}

/** Respuesta de POST /content/generate/learning-path?student_id=. */
export interface GenerateLearningPathResponse {
  is_success: boolean;
  message: string;
  learning_path: TopicPathRef[] | null;
}

/** Resultado de pedir que se genere la ruta del estudiante. */
export type GenerateLearningPathResult =
  | { created: true; paths: TopicPathRef[] }
  /** `exists`: ya tiene una ruta sin completar (el backend no devuelve sus ids). */
  | { created: false; reason: 'exists' | 'no-evaluation' | 'failed'; message: string };

export interface RegisterContentPayload {
  title: string;
  description: string;
  url: string;
  category: string;
  related_topic: string[];
}

export interface RegisterContentResponse {
  is_success: boolean;
  content_id?: string | null;
  message: string;
}

export interface UpdateContentResponse {
  is_success: boolean;
  message: string;
}

export interface GetContentByIdResponse {
  is_success: boolean;
  message: string;
  content: ContentItem | null;
}

export interface PagedContents {
  items: ContentItem[];
  total: number;
}

/** Payload de POST /content/rate (solo rol student, califica su propio user_id). */
export interface RateContentPayload {
  content_id: string;
  user_id: string;
  rating: number;
  comment?: string | null;
}

export interface RateContentResponse {
  is_success: boolean;
  message?: string | null;
}

/** Calificación de un recurso hecha por el estudiante. */
export interface ContentRating {
  content_id: string;
  title: string;
  summary: string;
  rating: number;
  student_id: string;
}

/** GET /content/ratings/content (rating_detail es null si aún no calificó). */
export interface GetContentRatingByUserResponse {
  is_success: boolean;
  message: string;
  rating_detail: ContentRating | null;
}

/** GET /content/ratings/all. */
export interface GetRatingsByUserResponse {
  is_success: boolean;
  message: string;
  rating_details: ContentRating[];
}

/** Payload de PUT /content/modify/rating (solo student). rating entre 0 y 5. */
export interface UpdateRatingPayload {
  content_id: string;
  user_id: string;
  rating: number;
  comment?: string | null;
}

export interface UpdateRatingResponse {
  is_success: boolean;
  message: string;
}

/** Item de GET /content/top-content/best|worse/{limit}. */
export interface TopContentItem {
  content_id: string;
  title: string;
  summary: string;
  rating: number;
}

export interface GetTopContentResponse {
  is_success: boolean;
  message: string;
  items: TopContentItem[];
}

/** Payload de PUT /content/update/status (solo admin). */
export interface UpdateResourceStatusPayload {
  content_id: string;
  status: boolean;
}

export interface UpdateResourceStatusResponse {
  is_success: boolean;
  message: string;
  content_id: string;
  new_status: boolean;
}

/** GET /content/learning-path/progress. */
export interface GetLearningPathProgressResponse {
  is_success: boolean;
  message: string;
  path_progress: number;
}

/** Payload de PUT /content/learning-path/update/status (solo student). */
export interface UpdateContentPathStatusPayload {
  path_id: string;
  content_id: string;
  status: boolean;
}

export interface UpdateContentPathStatusResponse {
  is_success: boolean;
  message: string;
  path_progress: number;
}
