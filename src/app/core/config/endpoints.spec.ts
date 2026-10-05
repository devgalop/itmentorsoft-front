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

  it('exposes the new assessment, content and user paths', () => {
    expect(ENDPOINTS.assessments.allQuestions).toBe('/assessments/all-questions');
    expect(ENDPOINTS.assessments.questionVersions).toBe('/assessments/question-versions');
    expect(ENDPOINTS.assessments.updateQuestionStatus).toBe('/assessments/question/update/status');
    expect(ENDPOINTS.content.modifyRating).toBe('/content/modify/rating');
    expect(ENDPOINTS.content.ratingsContent).toBe('/content/ratings/content');
    expect(ENDPOINTS.content.ratingsAll).toBe('/content/ratings/all');
    expect(ENDPOINTS.content.updateStatus).toBe('/content/update/status');
    expect(ENDPOINTS.content.learningPathProgress).toBe('/content/learning-path/progress');
    expect(ENDPOINTS.content.updateLearningPathStatus).toBe('/content/learning-path/update/status');
    expect(ENDPOINTS.users.userStatus).toBe('/users/user-status');
  });

  it('builds the top content paths with the limit', () => {
    expect(ENDPOINTS.content.topBest(5)).toBe('/content/top-content/best/5');
    expect(ENDPOINTS.content.topWorse(10)).toBe('/content/top-content/worse/10');
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
