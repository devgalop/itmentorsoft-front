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

export interface PagedStudents {
  students: StudentClassification[];
  total: number;
}
