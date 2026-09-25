import { ENDPOINTS } from './endpoints';

describe('ENDPOINTS', () => {
  it('exposes static assessment paths', () => {
    expect(ENDPOINTS.assessments.topics).toBe('/assessments/topics');
    expect(ENDPOINTS.assessments.review).toBe('/assessments/review');
  });

  it('builds dynamic paths with encoding', () => {
    expect(ENDPOINTS.assessments.questionById('abc 123')).toBe(
      '/assessments/questions/abc%20123',
    );
    expect(ENDPOINTS.users.byId('u/1')).toBe('/users/u%2F1');
    expect(ENDPOINTS.content.byId('c-1')).toBe('/content/c-1');
  });

  it('encodes category and level params', () => {
    expect(ENDPOINTS.assessments.questionsByCategory('APIs y sistemas')).toContain('APIs%20y%20sistemas');
    expect(ENDPOINTS.assessments.questionsByLevel('básico')).toContain('level/');
  });

  it('exposes the report and user paths', () => {
    expect(ENDPOINTS.reports.studentsByCategory).toBe('/reports/students-by-category');
    expect(ENDPOINTS.users.refreshSession).toBe('/users/sessions/refresh');
  });

  it('builds the content search paths with encoding', () => {
    expect(ENDPOINTS.content.byTopic('APIs')).toBe('/content/topic/APIs');
    expect(ENDPOINTS.content.byCategory('básico')).toBe('/content/category/b%C3%A1sico');
    expect(ENDPOINTS.content.byTitle('Intro a Python')).toBe('/content/title/Intro%20a%20Python');
    expect(ENDPOINTS.content.byCategoryTopic('básico', 'APIs')).toBe(
      '/content/category-topic/b%C3%A1sico/APIs',
    );
  });
});
