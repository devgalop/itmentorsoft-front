export interface RubricScore {
  score: number;
  explanation: string;
}

export interface PendingQuestion {
  question_id: string;
  text_to_evaluate: string;
  concept: string;
  definition: string;
  simple_explanation: string;
  correct_sample: string;
  wrong_sample: string;
  common_misconceptions: string[];
  rubric: RubricScore[];
  semantic_keywords: string[];
  status: string;
  difficulty: string;
  classification: string;
  version: number;
}

export interface GetPendingApprovalResponse {
  is_success: boolean;
  message: string;
  questions: PendingQuestion[];
  total: number;
}

export interface PagedPending {
  questions: PendingQuestion[];
  total: number;
}

export type ReviewStatus = 'published' | 'archived';

export interface ReviewQuestionPayload {
  question_id: string;
  reviewer_id: string;
  review_comments: string;
  status: ReviewStatus;
}

export interface ReviewQuestionResponse {
  is_success: boolean;
  message: string;
}
