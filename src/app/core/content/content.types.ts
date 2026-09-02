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

/** Tema con su lista de contenidos recomendados. */
export interface RecommendedTopic {
  topic: string;
  contents: RecommendedContent[];
}

export interface GetRecommendedLearningPathsResponse {
  is_success: boolean;
  message: string;
  recommendation: RecommendedTopic[];
}

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

export interface PagedContents {
  items: ContentItem[];
  total: number;
}
