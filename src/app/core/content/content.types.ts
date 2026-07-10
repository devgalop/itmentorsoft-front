export type ContentCategory = 'novice' | 'emerging' | 'average' | 'proficient';

export const CONTENT_CATEGORIES: ContentCategory[] = [
  'novice',
  'emerging',
  'average',
  'proficient',
];

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
