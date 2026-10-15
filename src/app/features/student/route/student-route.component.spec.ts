import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { StudentRouteComponent } from './student-route.component';
import { ContentService } from '../../../core/content/content.service';
import { AuthService } from '../../../core/auth/auth.service';
import { ToastService } from '../../../shared/ui/toast/toast.service';

describe('StudentRouteComponent', () => {
  let contentMock: {
    getLearningPathTopic: ReturnType<typeof vi.fn>;
    generateLearningPath: ReturnType<typeof vi.fn>;
    setLearningPathContentStatus: ReturnType<typeof vi.fn>;
    getContentById: ReturnType<typeof vi.fn>;
    rateContent: ReturnType<typeof vi.fn>;
    getRatingsByUser: ReturnType<typeof vi.fn>;
    updateRating: ReturnType<typeof vi.fn>;
  };
  let authMock: { userId: ReturnType<typeof vi.fn> };
  const toastMock = { success: vi.fn(), error: vi.fn(), info: vi.fn(), warning: vi.fn() };

  const topic = {
    topic_path_id: 'p1',
    topic: 'Arquitectura',
    contents: [{ content_id: 'c1', title: 'Capas', description: 'Intro', rating: 4.5 }],
    progress: 40,
  };
  const refs = [{ topic_path_id: 'p1', topic: 'Arquitectura' }];

  async function flush(): Promise<void> {
    for (let i = 0; i < 4; i++) await new Promise((r) => setTimeout(r));
  }

  function createComponent(): StudentRouteComponent {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        StudentRouteComponent,
        { provide: ContentService, useValue: contentMock },
        { provide: AuthService, useValue: authMock },
        { provide: ToastService, useValue: toastMock },
      ],
    });
    return TestBed.inject(StudentRouteComponent);
  }

  beforeEach(() => {
    localStorage.clear();
    contentMock = {
      getLearningPathTopic: vi.fn().mockResolvedValue(topic),
      generateLearningPath: vi.fn().mockResolvedValue({ created: true, paths: refs }),
      setLearningPathContentStatus: vi.fn().mockResolvedValue(100),
      getContentById: vi.fn(),
      rateContent: vi.fn().mockResolvedValue({ is_success: true, message: 'Content rated successfully.' }),
      getRatingsByUser: vi.fn().mockResolvedValue([]),
      updateRating: vi.fn().mockResolvedValue({ is_success: true, message: 'Rating updated successfully' }),
    };
    authMock = { userId: vi.fn().mockReturnValue('s1') };
    toastMock.success.mockClear();
    toastMock.error.mockClear();
  });

  afterEach(() => localStorage.clear());

  describe('cargar la ruta', () => {
    it('generates the path the first time, saves the ids and loads each topic by its id', async () => {
      const c = createComponent();
      await flush();
      expect(contentMock.generateLearningPath).toHaveBeenCalledWith('s1');
      expect(contentMock.getLearningPathTopic).toHaveBeenCalledWith('p1');
      expect(c.topics()).toEqual([topic]);
      expect(c.totalContents()).toBe(1);
      expect(JSON.parse(localStorage.getItem('itm.learning-paths.s1')!)).toEqual(refs);
    });

    it('reuses the saved ids without generating again', async () => {
      localStorage.setItem('itm.learning-paths.s1', JSON.stringify(refs));
      const c = createComponent();
      await flush();
      expect(contentMock.generateLearningPath).not.toHaveBeenCalled();
      expect(c.topics()).toEqual([topic]);
    });

    it('loads every topic of the path, skipping the ones that fail', async () => {
      localStorage.setItem(
        'itm.learning-paths.s1',
        JSON.stringify([...refs, { topic_path_id: 'p2', topic: 'APIs' }]),
      );
      contentMock.getLearningPathTopic.mockImplementation((id: string) =>
        id === 'p2' ? Promise.reject(new Error('boom')) : Promise.resolve(topic),
      );
      const c = createComponent();
      await flush();
      expect(c.topics()).toHaveLength(1);
      expect(c.loadError()).toBeNull();
    });

    it('discards saved ids that no longer work and generates the path once more', async () => {
      localStorage.setItem('itm.learning-paths.s1', JSON.stringify([{ topic_path_id: 'viejo', topic: 'X' }]));
      contentMock.getLearningPathTopic
        .mockResolvedValueOnce(null)
        .mockResolvedValue(topic);
      const c = createComponent();
      await flush();
      expect(contentMock.generateLearningPath).toHaveBeenCalledTimes(1);
      expect(c.topics()).toEqual([topic]);
      expect(JSON.parse(localStorage.getItem('itm.learning-paths.s1')!)).toEqual(refs);
    });

    it('does not loop forever when nothing can be loaded', async () => {
      contentMock.getLearningPathTopic.mockResolvedValue(null);
      const c = createComponent();
      await flush();
      expect(contentMock.generateLearningPath).toHaveBeenCalledTimes(2);
      expect(c.topics()).toEqual([]);
    });

    it('explains that the path exists but cannot be recovered when the backend gives no ids', async () => {
      contentMock.generateLearningPath.mockResolvedValue({ created: false, reason: 'exists', message: 'ya existe' });
      const c = createComponent();
      await flush();
      expect(c.unavailable()).toBe(true);
      expect(c.topics()).toEqual([]);
      expect(c.loadError()).toBeNull();
      expect(contentMock.getLearningPathTopic).not.toHaveBeenCalled();
    });

    it('lets the student try again', async () => {
      contentMock.generateLearningPath.mockResolvedValueOnce({ created: false, reason: 'exists', message: '' });
      const c = createComponent();
      await flush();
      expect(c.unavailable()).toBe(true);
      c.retry();
      await flush();
      expect(c.unavailable()).toBe(false);
      expect(c.topics()).toEqual([topic]);
    });

    it('shows no error when the student has no evaluation yet, just an empty route', async () => {
      contentMock.generateLearningPath.mockResolvedValue({ created: false, reason: 'no-evaluation', message: '' });
      const c = createComponent();
      await flush();
      expect(c.topics()).toEqual([]);
      expect(c.loadError()).toBeNull();
      expect(c.unavailable()).toBe(false);
    });

    it('shows an error when the generation fails', async () => {
      contentMock.generateLearningPath.mockResolvedValue({ created: false, reason: 'failed', message: 'x' });
      const c = createComponent();
      await flush();
      expect(c.loadError()).toContain('No se pudo generar');
    });

    it('shows the error message when a request throws', async () => {
      contentMock.generateLearningPath.mockRejectedValue(new Error('Sin conexión al servidor'));
      const c = createComponent();
      await flush();
      expect(c.loadError()).toBe('Sin conexión al servidor');
      expect(c.isLoading()).toBe(false);
    });

    it('rounds and clamps the progress of a topic', () => {
      const c = createComponent();
      expect(c.progressPct({ ...topic, progress: 33.6 })).toBe(34);
      expect(c.progressPct({ ...topic, progress: 140 })).toBe(100);
      expect(c.progressPct({ ...topic, progress: undefined })).toBe(0);
    });
  });

  describe('marcar recursos como vistos', () => {
    const item = topic.contents[0]!;

    it('marks a resource as seen, updates the progress of the topic and remembers it', async () => {
      const c = createComponent();
      await flush();
      expect(c.isDone(c.topics()[0]!, item)).toBe(false);
      await c.toggleDone(c.topics()[0]!, item);
      expect(contentMock.setLearningPathContentStatus).toHaveBeenCalledWith('p1', 'c1', true);
      expect(c.isDone(c.topics()[0]!, item)).toBe(true);
      expect(c.topics()[0]!.progress).toBe(100);
      expect(JSON.parse(localStorage.getItem('itm.learning-path-done.s1')!)).toEqual(['p1|c1']);
    });

    it('turns it back to pending when it is marked again', async () => {
      contentMock.setLearningPathContentStatus.mockResolvedValueOnce(100).mockResolvedValueOnce(0);
      const c = createComponent();
      await flush();
      await c.toggleDone(c.topics()[0]!, item);
      await c.toggleDone(c.topics()[0]!, item);
      expect(contentMock.setLearningPathContentStatus).toHaveBeenLastCalledWith('p1', 'c1', false);
      expect(c.isDone(c.topics()[0]!, item)).toBe(false);
      expect(c.topics()[0]!.progress).toBe(0);
    });

    it('shows the resources already seen when the student comes back', async () => {
      localStorage.setItem('itm.learning-paths.s1', JSON.stringify(refs));
      localStorage.setItem('itm.learning-path-done.s1', JSON.stringify(['p1|c1']));
      const c = createComponent();
      await flush();
      expect(c.isDone(c.topics()[0]!, item)).toBe(true);
    });

    it('trusts the backend when it says whether the resource is completed', async () => {
      contentMock.getLearningPathTopic.mockResolvedValue({
        ...topic,
        contents: [{ ...item, is_completed: true }],
      });
      const c = createComponent();
      await flush();
      expect(c.isDone(c.topics()[0]!, c.topics()[0]!.contents[0]!)).toBe(true);
    });

    it('keeps the previous state and warns when saving fails', async () => {
      contentMock.setLearningPathContentStatus.mockRejectedValue(new Error('Error en el servidor, intenta más tarde'));
      const c = createComponent();
      await flush();
      await c.toggleDone(c.topics()[0]!, item);
      expect(c.isDone(c.topics()[0]!, item)).toBe(false);
      expect(c.topics()[0]!.progress).toBe(40);
      expect(toastMock.error).toHaveBeenCalledWith('No se pudo actualizar el recurso', 'Error en el servidor, intenta más tarde');
      expect(c.savingKey()).toBeNull();
    });

    it('ignores a second click while one is being saved', async () => {
      let release: (n: number) => void = () => {};
      contentMock.setLearningPathContentStatus.mockReturnValue(new Promise<number>((r) => (release = r)));
      const c = createComponent();
      await flush();
      const first = c.toggleDone(c.topics()[0]!, item);
      await c.toggleDone(c.topics()[0]!, item);
      expect(contentMock.setLearningPathContentStatus).toHaveBeenCalledTimes(1);
      release(100);
      await first;
    });

    it('does nothing for a topic without id or when there is no user', async () => {
      const c = createComponent();
      await flush();
      await c.toggleDone({ ...topic, topic_path_id: undefined }, item);
      authMock.userId.mockReturnValue(null);
      await c.toggleDone(c.topics()[0]!, item);
      expect(contentMock.setLearningPathContentStatus).not.toHaveBeenCalled();
    });
  });

  describe('vista de la ruta', () => {
    const second = { ...topic, topic_path_id: 'p2', topic: 'APIs', progress: 100, contents: [
      { content_id: 'c2', title: 'REST', description: 'x', rating: 3 },
      { content_id: 'c3', title: 'HTTP', description: 'y', rating: 4 },
    ] };

    async function loaded(): Promise<StudentRouteComponent> {
      localStorage.setItem('itm.learning-paths.s1', JSON.stringify([...refs, { topic_path_id: 'p2', topic: 'APIs' }]));
      contentMock.getLearningPathTopic.mockImplementation((id: string) => Promise.resolve(id === 'p2' ? second : topic));
      const c = createComponent();
      await flush();
      return c;
    }

    it('opens only the first topic when the route loads', async () => {
      const c = await loaded();
      expect(c.isTopicOpen(c.topics()[0]!)).toBe(true);
      expect(c.isTopicOpen(c.topics()[1]!)).toBe(false);
    });

    it('opens and folds topics independently', async () => {
      const c = await loaded();
      c.toggleTopic(c.topics()[1]!);
      expect(c.isTopicOpen(c.topics()[1]!)).toBe(true);
      expect(c.isTopicOpen(c.topics()[0]!)).toBe(true);
      c.toggleTopic(c.topics()[0]!);
      expect(c.isTopicOpen(c.topics()[0]!)).toBe(false);
    });

    it('summarizes the whole route: topics, resources, seen and the general progress', async () => {
      const c = await loaded();
      expect(c.overview()).toEqual({ topics: 2, total: 3, done: 0, overall: 70 });
      await c.toggleDone(c.topics()[0]!, topic.contents[0]!);
      expect(c.overview().done).toBe(1);
    });

    it('computes the general progress from the seen resources when the backend reports none', async () => {
      contentMock.getLearningPathTopic.mockResolvedValue({ ...topic, progress: undefined });
      const c = createComponent();
      await flush();
      expect(c.overview().overall).toBe(0);
      await c.toggleDone(c.topics()[0]!, topic.contents[0]!);
      expect(c.overview().overall).toBe(100);
    });

    it('counts how many resources of a topic are seen', async () => {
      const c = await loaded();
      expect(c.doneCount(c.topics()[1]!)).toBe(0);
      localStorage.setItem('itm.learning-path-done.s1', JSON.stringify(['p2|c2']));
      const again = createComponent();
      await flush();
      expect(again.doneCount(again.topics()[1]!)).toBe(1);
    });

    it('gives each topic a color from the palette, in order', async () => {
      const c = await loaded();
      expect(c.topicColor(0)).not.toBe(c.topicColor(1));
      expect(c.topicColor(99)).toBeTruthy();
    });
  });

  it('shows an error when there is no userId', () => {
    authMock.userId.mockReturnValue(null);
    const c = createComponent();
    expect(contentMock.generateLearningPath).not.toHaveBeenCalled();
    expect(c.loadError()).toContain('identificar tu usuario');
  });

  it('opens the resource url fetched from the content detail', async () => {
    const openSpy = vi.spyOn(window, 'open').mockImplementation(() => null);
    contentMock.getContentById.mockResolvedValue({
      content_id: 'c1',
      title: 'Capas',
      summary: 'Intro',
      url: 'https://ejemplo.com/recurso',
      category: 'básico',
      related_topics: ['Arquitectura'],
    });
    const c = createComponent();
    await Promise.resolve();
    await Promise.resolve();

    await c.openResource('c1');

    expect(contentMock.getContentById).toHaveBeenCalledWith('c1');
    expect(openSpy).toHaveBeenCalledWith('https://ejemplo.com/recurso', '_blank', 'noopener');
    expect(c.openingId()).toBeNull();
    openSpy.mockRestore();
  });

  it('shows a toast and does not open a tab when the resource has no url', async () => {
    const openSpy = vi.spyOn(window, 'open').mockImplementation(() => null);
    contentMock.getContentById.mockResolvedValue(null);
    const c = createComponent();
    await Promise.resolve();
    await Promise.resolve();

    await c.openResource('missing');

    expect(openSpy).not.toHaveBeenCalled();
    expect(toastMock.error).toHaveBeenCalledWith('No se pudo abrir', expect.any(String));
    openSpy.mockRestore();
  });

  it('shows a toast when fetching the resource fails', async () => {
    contentMock.getContentById.mockRejectedValue(new Error('Sin conexión al servidor'));
    const c = createComponent();
    await Promise.resolve();
    await Promise.resolve();

    await c.openResource('c1');

    expect(toastMock.error).toHaveBeenCalledWith('No se pudo abrir el recurso', 'Sin conexión al servidor');
    expect(c.openingId()).toBeNull();
  });

  it('computes filled stars clamped between 0 and 5', () => {
    const c = createComponent();
    expect(c.stars(4.5)).toBe(5);
    expect(c.stars(-1)).toBe(0);
    expect(c.stars(3.2)).toBe(3);
  });

  it('rates a resource and shows a success toast', async () => {
    const c = createComponent();
    await vi.waitFor(() => expect(c.isLoading()).toBe(false));

    await c.rate('c1', 4);

    expect(contentMock.rateContent).toHaveBeenCalledWith({ content_id: 'c1', user_id: 's1', rating: 4 });
    expect(c.myRatings()['c1']).toBe(4);
    expect(toastMock.success).toHaveBeenCalled();
    expect(c.ratingId()).toBeNull();
  });

  it('loads the ratings the student already made', async () => {
    contentMock.getRatingsByUser.mockResolvedValue([
      { content_id: 'c1', title: 'Capas', summary: '', rating: 3, student_id: 's1' },
    ]);
    const c = createComponent();
    await vi.waitFor(() => expect(c.myRatings()['c1']).toBe(3));
    expect(contentMock.getRatingsByUser).toHaveBeenCalledWith('s1');
  });

  it('still shows the route when the ratings cannot be loaded', async () => {
    contentMock.getRatingsByUser.mockRejectedValue(new Error('Error en el servidor, intenta más tarde'));
    const c = createComponent();
    await vi.waitFor(() => expect(c.isLoading()).toBe(false));
    expect(c.topics()).toEqual([topic]);
    expect(c.loadError()).toBeNull();
    expect(c.myRatings()).toEqual({});
  });

  it('modifies the rating instead of creating a new one when the resource was already rated', async () => {
    const c = createComponent();
    await vi.waitFor(() => expect(c.isLoading()).toBe(false));
    c.myRatings.set({ c1: 2 });
    await c.rate('c1', 5);
    expect(contentMock.updateRating).toHaveBeenCalledWith({ content_id: 'c1', user_id: 's1', rating: 5 });
    expect(contentMock.rateContent).not.toHaveBeenCalled();
    expect(c.myRatings()['c1']).toBe(5);
    expect(toastMock.success).toHaveBeenCalledWith('Calificación actualizada', expect.any(String));
  });

  it('does not rate when there is no logged-in user id', async () => {
    authMock.userId.mockReturnValue(null);
    const c = createComponent();

    await c.rate('c1', 4);

    expect(contentMock.rateContent).not.toHaveBeenCalled();
  });

  it('shows an error toast and does not record the rating when the request fails', async () => {
    contentMock.rateContent.mockRejectedValue(new Error('Sin conexión al servidor'));
    const c = createComponent();

    await c.rate('c1', 4);

    expect(c.myRatings()['c1']).toBeUndefined();
    expect(toastMock.error).toHaveBeenCalledWith('No se pudo enviar tu calificación', 'Sin conexión al servidor');
  });

  it('shows an error toast when the backend responds with is_success false', async () => {
    contentMock.rateContent.mockResolvedValue({ is_success: false, message: 'Content with ID c1 not found.' });
    const c = createComponent();

    await c.rate('c1', 4);

    expect(c.myRatings()['c1']).toBeUndefined();
    expect(toastMock.error).toHaveBeenCalledWith('No se pudo enviar tu calificación', 'Content with ID c1 not found.');
  });
});
