export const QUESTION_DIFFICULTIES = ['básico', 'intermedio', 'avanzado'] as const;
export type QuestionDifficulty = (typeof QUESTION_DIFFICULTIES)[number];

export const QUESTION_CATEGORIES = [
  'APIs y sistemas distribuidos',
  'Diseño orientado a objetos',
  'Fundamentos y paradigmas',
  'Principios de arquitectura y mantenibilidad',
] as const;
export type QuestionCategory = (typeof QUESTION_CATEGORIES)[number];

/** Item de la lista devuelta por level/category (mínimo). */
export interface EvaluativeQuestion {
  question_id: string;
  text_to_evaluate: string;
}

export interface GetQuestionsResponse {
  is_success: boolean;
  message: string;
  questions: EvaluativeQuestion[];
}

/** Detalle completo de una pregunta (GET /questions/{id}). */
export interface QuestionRubricScore {
  score: number;
  explanation: string;
}

export interface QuestionDetail {
  question_id: string;
  text: string;
  concept: string;
  definition: string;
  simple_explanation: string;
  correct_sample: string;
  wrong_sample: string;
  common_misconception: string[];
  rubric: QuestionRubricScore[];
  semantic_keywords: string[];
  status: string;
}

export interface GetQuestionByIdResponse {
  is_success: boolean;
  message: string;
  question: QuestionDetail | null;
}

export interface GetCategoriesResponse {
  is_success: boolean;
  message: string;
  categories: string[];
}

export interface RubricCriterion {
  score: number;
  criteria: string;
}

export interface RegisterQuestionPayload {
  text: string;
  concept: string;
  definition: string;
  simple_explanation: string;
  correct_sample: string;
  wrong_sample: string;
  common_misconception: string[];
  rubric: RubricCriterion[];
  semantic_keywords: string[];
}

export interface RegisterQuestionResponse {
  is_success: boolean;
  message: string;
  question_id?: string | null;
}
