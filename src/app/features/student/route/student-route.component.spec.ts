import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { StudentRouteComponent } from './student-route.component';
import { ContentService } from '../../../core/content/content.service';
import { AuthService } from '../../../core/auth/auth.service';
import { ToastService } from '../../../shared/ui/toast/toast.service';

describe('StudentRouteComponent', () => {
  let contentMock: {
    getRecommendedLearningPaths: ReturnType<typeof vi.fn>;
    getContentById: ReturnType<typeof vi.fn>;
    rateContent: ReturnType<typeof vi.fn>;
  };
  let authMock: { userId: ReturnType<typeof vi.fn> };
  const toastMock = { success: vi.fn(), error: vi.fn(), info: vi.fn(), warning: vi.fn() };

  const recommendation = [
    {
      topic: 'Arquitectura',
      contents: [{ content_id: 'c1', title: 'Capas', description: 'Intro', rating: 4.5 }],
    },
  ];

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
    contentMock = {
      getRecommendedLearningPaths: vi.fn().mockResolvedValue(recommendation),
      getContentById: vi.fn(),
      rateContent: vi.fn().mockResolvedValue({ is_success: true, message: 'Content rated successfully.' }),
    };
    authMock = { userId: vi.fn().mockReturnValue('s1') };
    toastMock.success.mockClear();
    toastMock.error.mockClear();
  });

  it('loads the recommended learning path for the logged-in student', async () => {
    const c = createComponent();
    await Promise.resolve();
    await Promise.resolve();
    expect(contentMock.getRecommendedLearningPaths).toHaveBeenCalledWith('s1');
    expect(c.topics()).toEqual(recommendation);
    expect(c.totalContents()).toBe(1);
  });

  it('shows an error when there is no userId', () => {
    authMock.userId.mockReturnValue(null);
    const c = createComponent();
    expect(contentMock.getRecommendedLearningPaths).not.toHaveBeenCalled();
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

    await c.rate('c1', 4);

    expect(contentMock.rateContent).toHaveBeenCalledWith({ content_id: 'c1', user_id: 's1', rating: 4 });
    expect(c.myRatings()['c1']).toBe(4);
    expect(toastMock.success).toHaveBeenCalled();
    expect(c.ratingId()).toBeNull();
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
