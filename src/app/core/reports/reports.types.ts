export interface StudentClassification {
  student_id: string;
  student_name: string;
  knowledge_classification: string;
}

export interface PaginatedStudentResult {
  students: StudentClassification[];
  total_students: number;
  page: number;
}

export interface GetAllStudentsResponse {
  is_success: boolean;
  message: string;
  result: PaginatedStudentResult | null;
}

export interface GetStudentsByCategoryResponse {
  is_success: boolean;
  message: string;
  result: PaginatedStudentResult | null;
}

export interface PagedStudents {
  students: StudentClassification[];
  total: number;
}

export interface ProgressProfileItem {
  topic: string;
  score: number;
  index: number;
}

export interface StudentProgress {
  student_id: string;
  classification: string;
  knowledge_profile: ProgressProfileItem[];
}

export interface GetStudentProgressResponse {
  is_success: boolean;
  message: string;
  progress: StudentProgress | null;
}

export interface SummaryProfileItem {
  topic: string;
  score: number;
}

export interface StudentSummary {
  student_id: string;
  name: string;
  knowledge_classification: string;
  profile: SummaryProfileItem[];
  feedback: string;
}

export interface GetStudentSummaryResponse {
  is_success: boolean;
  message: string;
  summary: StudentSummary | null;
}
