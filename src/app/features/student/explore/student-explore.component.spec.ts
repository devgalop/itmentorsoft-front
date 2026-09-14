import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { StudentExploreComponent } from './student-explore.component';
import { ContentService } from '../../../core/content/content.service';
import { AssessmentsService } from '../../../core/assessments/assessments.service';

const item = {
  content_id: 'c1',
  title: 'Recurso',
  summary: 'Resumen',
  url: 'https://ejemplo.com',
  category: 'principiante',
  related_topics: ['APIs'],
};

describe('StudentExploreComponent', () => {
  let contentMock: {
    getAllContentsPaged: ReturnType<typeof vi.fn>;
    getContentsByTitle: ReturnType<typeof vi.fn>;
    getContentsByCategory: ReturnType<typeof vi.fn>;
    getContentsByTopic: ReturnType<typeof vi.fn>;
    getContentsByCategoryTopic: ReturnType<typeof vi.fn>;
  };
  let assessmentsMock: { getTopics: ReturnType<typeof vi.fn> };

  function createComponent(): StudentExploreComponent {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        StudentExploreComponent,
        { provide: ContentService, useValue: contentMock },
        { provide: AssessmentsService, useValue: assessmentsMock },
      ],
    });
    return TestBed.inject(StudentExploreComponent);
  }

  beforeEach(() => {
    contentMock = {
      getAllContentsPaged: vi.fn().mockResolvedValue({ items: [item], total: 1 }),
      getContentsByTitle: vi.fn().mockResolvedValue({ items: [], total: 0 }),
      getContentsByCategory: vi.fn().mockResolvedValue({ items: [], total: 0 }),
      getContentsByTopic: vi.fn().mockResolvedValue({ items: [], total: 0 }),
      getContentsByCategoryTopic: vi.fn().mockResolvedValue({ items: [], total: 0 }),
    };
    assessmentsMock = { getTopics: vi.fn().mockResolvedValue(['APIs', 'SOLID']) };
  });

  it('loads all contents on creation when there is no filter', async () => {
    const c = createComponent();
    await Promise.resolve();
    await Promise.resolve();
    expect(contentMock.getAllContentsPaged).toHaveBeenCalledWith(0, 12);
    expect(c.resources()).toEqual([item]);
    expect(c.total()).toBe(1);
    expect(assessmentsMock.getTopics).toHaveBeenCalled();
    expect(c.topicOptions()).toEqual(['APIs', 'SOLID']);
  });

  it('does not search until "Buscar" is clicked (or Enter), taking priority over other filters', async () => {
    const c = createComponent();
    await Promise.resolve();

    c.filterCategory.set('básico');
    c.filterTopic.set('APIs');
    c.onTitleInput('Intro');
    expect(contentMock.getContentsByTitle).not.toHaveBeenCalled();

    c.onSearchSubmit();
    await Promise.resolve();
    await Promise.resolve();

    expect(contentMock.getContentsByTitle).toHaveBeenCalledWith('Intro', 0, 12);
    expect(contentMock.getContentsByCategory).not.toHaveBeenCalled();
    expect(contentMock.getContentsByCategoryTopic).not.toHaveBeenCalled();
  });

  it('blocks the search for titles between 1 and 2 characters', async () => {
    const c = createComponent();
    await Promise.resolve();
    contentMock.getContentsByTitle.mockClear();

    c.onTitleInput('in');
    expect(c.titleTooShort()).toBe(true);

    c.onSearchSubmit();
    await Promise.resolve();

    expect(contentMock.getContentsByTitle).not.toHaveBeenCalled();
  });

  it('combines category and topic when both are selected and there is no title', async () => {
    const c = createComponent();
    await Promise.resolve();

    c.onCategoryChange('básico');
    await Promise.resolve();
    c.onTopicChange('APIs');
    await Promise.resolve();
    await Promise.resolve();

    expect(contentMock.getContentsByCategoryTopic).toHaveBeenCalledWith('básico', 'APIs', 0, 12);
  });

  it('filters by category alone', async () => {
    const c = createComponent();
    await Promise.resolve();

    c.onCategoryChange('básico');
    await Promise.resolve();
    await Promise.resolve();

    expect(contentMock.getContentsByCategory).toHaveBeenCalledWith('básico', 0, 12);
  });

  it('filters by topic alone', async () => {
    const c = createComponent();
    await Promise.resolve();

    c.onTopicChange('APIs');
    await Promise.resolve();
    await Promise.resolve();

    expect(contentMock.getContentsByTopic).toHaveBeenCalledWith('APIs', 0, 12);
  });

  it('clearFilters resets everything and reloads all contents', async () => {
    const c = createComponent();
    await Promise.resolve();
    c.onCategoryChange('básico');
    await Promise.resolve();
    await Promise.resolve();
    contentMock.getAllContentsPaged.mockClear();

    c.clearFilters();
    await Promise.resolve();
    await Promise.resolve();

    expect(c.searchTitle()).toBe('');
    expect(c.filterCategory()).toBe('all');
    expect(c.filterTopic()).toBe('all');
    expect(contentMock.getAllContentsPaged).toHaveBeenCalledWith(0, 12);
    expect(c.hasActiveFilter()).toBe(false);
  });

  it('paginates with nextPage/prevPage', async () => {
    contentMock.getAllContentsPaged.mockResolvedValue({ items: [item], total: 30 });
    const c = createComponent();
    await Promise.resolve();
    await Promise.resolve();

    expect(c.totalPages()).toBe(3);
    await c.nextPage();
    expect(c.page()).toBe(1);
    expect(contentMock.getAllContentsPaged).toHaveBeenCalledWith(1, 12);

    await c.prevPage();
    expect(c.page()).toBe(0);
  });

  it('captures a thrown error', async () => {
    contentMock.getAllContentsPaged.mockRejectedValue(new Error('Sin conexión al servidor'));
    const c = createComponent();
    await Promise.resolve();
    await Promise.resolve();

    expect(c.loadError()).toBe('Sin conexión al servidor');
    expect(c.resources()).toEqual([]);
  });
});
