// Tipos del flujo de evaluación del estudiante (todos requieren user_id del login).

export interface TopicQuestion {
  question_id: string;
  topic: string;
  text_to_evaluate: string;
}

export interface GetAssessmentByTopicResponse {
  is_success: boolean;
  message: string;
  assessment_id: string | null;
  topic_id: string | null;
  questions: TopicQuestion[] | null;
}

export interface GeneratedAssessment {
  assessmentId: string;
  topicId: string | null;
  questions: TopicQuestion[];
}

export interface GetTopicsResponse {
  is_success: boolean;
  message: string;
  topics: string[];
}

export interface AssessmentAnswerInput {
  question_id: string;
  answer: string;
  takes_time_seconds: number;
}

export interface SaveAssessmentPayload {
  assessment_id: string;
  user_id: string;
  answers: AssessmentAnswerInput[];
}

export interface SaveAssessmentResponse {
  is_success: boolean;
  message: string;
}

export interface QualificationStatusResponse {
  is_already_qualified: boolean;
}

export interface AnswerScore {
  question_id: string;
  question_text: string;
  answer: string;
  score: number;
  feedback: string;
  misconceptions?: string[] | null;
  key_concepts?: string[] | null;
}

export interface StudentAssessmentResult {
  assessment_id: string;
  user_id: string;
  avg_score: number;
  classification: string;
  feedback: string;
  answer_scores: AnswerScore[];
}

export interface GetAssessmentResultResponse {
  is_success: boolean;
  message: string;
  result: StudentAssessmentResult | null;
}

/** Una evaluación en el historial del estudiante. */
export interface AssessmentSummary {
  assessment_id: string;
  score: number;
  date_taken: string;
  classification: string | null;
  feedback: string | null;
}

export interface GetAssessmentsSummaryResponse {
  is_success: boolean;
  message: string;
  total_assessments: number;
  assessments: AssessmentSummary[];
}
