export interface PendingQuestion {
  question_id: string;
  text_to_evaluate: string;
  concept: string;
  status: string;
  difficulty: string;
  classification: string;
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
