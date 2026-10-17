import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { ContentService } from './content.service';

describe('ContentService', () => {
  let service: ContentService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [ContentService, provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(ContentService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  describe('getCompleteLearningPaths', () => {
    const url = (r: { url: string }) => r.url === '/content/complete/path';

    it('GETs the paths of the student with the page and returns every topic with its state', async () => {
      const promise = service.getCompleteLearningPaths('s1');
      const req = httpMock.expectOne(
        (r) => url(r) && r.params.get('user_id') === 's1' && r.params.get('page') === '0' && r.params.get('page_size') === '100',
      );
      expect(req.request.method).toBe('GET');
      const learning_path = [
        {
          topic_path_id: 'p1',
          topic: 'Arquitectura',
          progress: 50,
          is_completed: false,
          contents: [{ content_id: 'c1', title: 'Capas', description: 'Intro', rating: 4.5, is_completed: true }],
        },
      ];
      req.flush({ is_success: true, message: 'ok', learning_path });
      expect(await promise).toEqual(learning_path);
    });

    it('returns an empty list when there is no learning path in the response', async () => {
      const promise = service.getCompleteLearningPaths('s1');
      httpMock.expectOne(url).flush({ is_success: true, message: 'ok', learning_path: null });
      expect(await promise).toEqual([]);
    });

    it('treats "not found" as no paths, whether it comes as a 404 or wrapped in a 500', async () => {
      const first = service.getCompleteLearningPaths('s1');
      httpMock.expectOne(url).flush({ detail: 'x' }, { status: 404, statusText: 'Not Found' });
      expect(await first).toEqual([]);

      const second = service.getCompleteLearningPaths('s1');
      httpMock
        .expectOne(url)
        .flush({ detail: '404: La ruta de aprendizaje no fue encontrada' }, { status: 500, statusText: 'x' });
      expect(await second).toEqual([]);
    });

    it('also understands the error body of the newer backend ({ status, message, path })', async () => {
      const promise = service.getCompleteLearningPaths('s1');
      httpMock.expectOne(url).flush(
        { status: 500, message: '404: La ruta de aprendizaje no fue encontrada', path: '/content/complete/path' },
        { status: 500, statusText: 'x' },
      );
      expect(await promise).toEqual([]);
    });

    it('keeps the usual messages for other errors', async () => {
      const promise = service.getCompleteLearningPaths('s1');
      httpMock.expectOne(url).flush({ detail: 'algo' }, { status: 500, statusText: 'x' });
      await expect(promise).rejects.toThrow('Error en el servidor, intenta más tarde');
    });
  });

  describe('setLearningPathContentStatus', () => {
    const url = '/content/learning-path/update/status';

    it('PUTs the path, the content and the status, and returns the new progress', async () => {
      const promise = service.setLearningPathContentStatus('p1', 'c1', true);
      const req = httpMock.expectOne(url);
      expect(req.request.method).toBe('PUT');
      expect(req.request.body).toEqual({ path_id: 'p1', content_id: 'c1', status: true });
      req.flush({ is_success: true, message: 'ok', path_progress: 50 });
      expect(await promise).toBe(50);
    });

    it('can mark a resource as pending again', async () => {
      const promise = service.setLearningPathContentStatus('p1', 'c1', false);
      const req = httpMock.expectOne(url);
      expect(req.request.body.status).toBe(false);
      req.flush({ is_success: true, message: 'ok', path_progress: 0 });
      expect(await promise).toBe(0);
    });

    it('fails with the backend message when it is not successful', async () => {
      const promise = service.setLearningPathContentStatus('p1', 'c1', true);
      httpMock.expectOne(url).flush({ is_success: false, message: 'No encontrado', path_progress: 0 });
      await expect(promise).rejects.toThrow('No encontrado');
    });

    it('maps HTTP errors to the usual messages', async () => {
      const promise = service.setLearningPathContentStatus('p1', 'c1', true);
      httpMock.expectOne(url).flush({ detail: 'x' }, { status: 500, statusText: 'x' });
      await expect(promise).rejects.toThrow('Error en el servidor, intenta más tarde');
    });
  });

  describe('generateLearningPath', () => {
    const url = (r: { url: string }) => r.url === '/content/generate/learning-path';

    it('POSTs with the student_id and returns the created topic paths', async () => {
      const promise = service.generateLearningPath('s1');
      const req = httpMock.expectOne((r) => url(r) && r.params.get('student_id') === 's1');
      expect(req.request.method).toBe('POST');
      const paths = [{ topic_path_id: 'p1', topic: 'APIs' }];
      req.flush({ is_success: true, message: 'ok', learning_path: paths });
      expect(await promise).toEqual({ created: true, paths });
    });

    it('reports a failure when nothing was created', async () => {
      const promise = service.generateLearningPath('s1');
      httpMock.expectOne(url).flush({ is_success: false, message: 'falló', learning_path: null });
      expect(await promise).toEqual({ created: false, reason: 'failed', message: 'falló' });
    });

    it('recognizes that the path already exists (no ids are given in that case)', async () => {
      const promise = service.generateLearningPath('s1');
      httpMock
        .expectOne(url)
        .flush({ detail: '400: La ruta de aprendizaje ya existe y no está completada.' }, { status: 500, statusText: 'x' });
      const result = await promise;
      expect(result).toMatchObject({ created: false, reason: 'exists' });
    });

    it('recognizes that the student has no evaluation results yet', async () => {
      const promise = service.generateLearningPath('s1');
      httpMock
        .expectOne(url)
        .flush({ detail: '400: No se encontraron resultados de evaluación para el usuario.' }, { status: 500, statusText: 'x' });
      expect(await promise).toMatchObject({ created: false, reason: 'no-evaluation' });
    });

    it('reports other server errors as a failure and keeps the usual messages for network and permission errors', async () => {
      const server = service.generateLearningPath('s1');
      httpMock.expectOne(url).flush({ detail: 'algo' }, { status: 500, statusText: 'x' });
      expect(await server).toMatchObject({ created: false, reason: 'failed' });

      const denied = service.generateLearningPath('s1');
      httpMock.expectOne(url).flush({ detail: 'x' }, { status: 403, statusText: 'x' });
      await expect(denied).rejects.toThrow('No tienes permisos para esta acción');

      const invalid = service.generateLearningPath('s1');
      httpMock.expectOne(url).flush({ detail: 'x' }, { status: 422, statusText: 'x' });
      await expect(invalid).rejects.toThrow('Datos inválidos');
    });
  });

  describe('getAllContents', () => {
    it('GETs /content/ and returns the items', async () => {
      const promise = service.getAllContents();
      const req = httpMock.expectOne(
        (r) =>
          r.url === '/content/' &&
          r.params.get('page') === '0' &&
          r.params.get('page_size') === '50',
      );
      expect(req.request.method).toBe('GET');
      const items = [
        {
          content_id: 'c1',
          title: 'Recurso',
          summary: 'resumen',
          url: 'https://x.com',
          category: 'principiante',
          related_topics: ['t1'],
        },
      ];
      req.flush({ is_success: true, message: 'ok', items, total: 1 });
      expect(await promise).toEqual(items);
    });

    it('returns an empty array when items is missing', async () => {
      const promise = service.getAllContents();
      httpMock
        .expectOne((r) => r.url === '/content/' && r.params.has('page'))
        .flush({ is_success: true, message: 'ok' });
      expect(await promise).toEqual([]);
    });

    it('maps a 403 into a permissions error', async () => {
      const promise = service.getAllContents();
      httpMock
        .expectOne((r) => r.url === '/content/' && r.params.has('page'))
        .flush({ detail: 'x' }, { status: 403, statusText: 'Forbidden' });
      await expect(promise).rejects.toThrow('No tienes permisos para esta acción');
    });
  });

  describe('getAllContentsPaged', () => {
    it('GETs /content/ and returns items+total', async () => {
      const promise = service.getAllContentsPaged(0, 12);
      const req = httpMock.expectOne(
        (r) => r.url === '/content/' && r.params.get('page') === '0' && r.params.get('page_size') === '12',
      );
      req.flush({ is_success: true, message: 'ok', items: [], total: 7 });
      expect(await promise).toEqual({ items: [], total: 7 });
    });
  });

  describe('getContentById', () => {
    it('GETs /content/{id} and returns the content', async () => {
      const promise = service.getContentById('c-1');
      const req = httpMock.expectOne('/content/c-1');
      expect(req.request.method).toBe('GET');
      const content = {
        content_id: 'c-1',
        title: 'Recurso',
        summary: 'resumen',
        url: 'https://x.com',
        category: 'principiante',
        related_topics: ['t1'],
      };
      req.flush({ is_success: true, message: 'ok', content });
      expect(await promise).toEqual(content);
    });

    it('returns null on 404 instead of throwing', async () => {
      const promise = service.getContentById('missing');
      httpMock
        .expectOne('/content/missing')
        .flush(
          { detail: { is_success: false, message: 'not found', content: null } },
          { status: 404, statusText: 'Not Found' },
        );
      expect(await promise).toBeNull();
    });
  });

  describe('getContentsByTopic', () => {
    it('GETs /content/topic/{criteria} with pagination and returns items+total', async () => {
      const promise = service.getContentsByTopic('APIs');
      const req = httpMock.expectOne(
        (r) =>
          r.url === '/content/topic/APIs' &&
          r.params.get('page') === '0' &&
          r.params.get('page_size') === '10',
      );
      expect(req.request.method).toBe('GET');
      const items = [
        {
          content_id: 'c1',
          title: 'Recurso',
          summary: 'resumen',
          url: 'https://x.com',
          category: 'principiante',
          related_topics: ['APIs'],
        },
      ];
      req.flush({ is_success: true, message: 'ok', items, total: 1 });
      expect(await promise).toEqual({ items, total: 1 });
    });

    it('returns an empty page on 404 instead of throwing', async () => {
      const promise = service.getContentsByTopic('Inexistente');
      httpMock
        .expectOne((r) => r.url === '/content/topic/Inexistente')
        .flush({ detail: { is_success: false, message: 'not found', items: [], total: 0 } }, { status: 404, statusText: 'Not Found' });
      expect(await promise).toEqual({ items: [], total: 0 });
    });
  });

  describe('getContentsByCategory', () => {
    it('GETs /content/category/{criteria} with pagination', async () => {
      const promise = service.getContentsByCategory('básico', 1, 20);
      const req = httpMock.expectOne(
        (r) =>
          r.url === '/content/category/b%C3%A1sico' &&
          r.params.get('page') === '1' &&
          r.params.get('page_size') === '20',
      );
      req.flush({ is_success: true, message: 'ok', items: [], total: 0 });
      expect(await promise).toEqual({ items: [], total: 0 });
    });
  });

  describe('getContentsByTitle', () => {
    it('GETs /content/title/{criteria} with pagination', async () => {
      const promise = service.getContentsByTitle('Intro');
      const req = httpMock.expectOne((r) => r.url === '/content/title/Intro');
      req.flush({ is_success: true, message: 'ok', items: [], total: 0 });
      expect(await promise).toEqual({ items: [], total: 0 });
    });
  });

  describe('getContentsByCategoryTopic', () => {
    it('GETs /content/category-topic/{category}/{topic} with pagination', async () => {
      const promise = service.getContentsByCategoryTopic('básico', 'APIs');
      const req = httpMock.expectOne((r) => r.url === '/content/category-topic/b%C3%A1sico/APIs');
      req.flush({ is_success: true, message: 'ok', items: [], total: 0 });
      expect(await promise).toEqual({ items: [], total: 0 });
    });
  });

  describe('registerContent', () => {
    const payload = {
      title: 'Un recurso',
      description: 'descripción válida',
      url: 'https://ejemplo.com',
      category: 'principiante',
      related_topic: ['APIs'],
    };

    it('POSTs the payload to /content/', async () => {
      const promise = service.registerContent(payload);
      const req = httpMock.expectOne('/content/');
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(payload);
      req.flush({ is_success: true, content_id: 'c-1', message: 'creado' });
      const res = await promise;
      expect(res.is_success).toBe(true);
      expect(res.content_id).toBe('c-1');
    });

    it('maps a 422 into a validation error', async () => {
      const promise = service.registerContent(payload);
      httpMock.expectOne('/content/').flush({ detail: 'x' }, { status: 422, statusText: 'Unprocessable' });
      await expect(promise).rejects.toThrow('Datos inválidos');
    });
  });

  describe('updateContent', () => {
    const payload = {
      title: 'Un recurso',
      description: 'descripción válida',
      url: 'https://ejemplo.com',
      category: 'principiante',
      related_topic: ['APIs'],
    };

    it('PUTs the payload to /content/{id}', async () => {
      const promise = service.updateContent('c-1', payload);
      const req = httpMock.expectOne('/content/c-1');
      expect(req.request.method).toBe('PUT');
      expect(req.request.body).toEqual(payload);
      req.flush({ is_success: true, message: 'actualizado' });
      const res = await promise;
      expect(res.is_success).toBe(true);
    });

    it('encodes the content id in the URL', async () => {
      const promise = service.updateContent('a/b', payload);
      const req = httpMock.expectOne('/content/a%2Fb');
      req.flush({ is_success: true, message: 'ok' });
      await promise;
      expect(req.request.method).toBe('PUT');
    });
  });

  describe('rateContent', () => {
    it('POSTs the rating payload to /content/rate', async () => {
      const payload = { content_id: 'c-1', user_id: 'u-1', rating: 4 };
      const promise = service.rateContent(payload);
      const req = httpMock.expectOne('/content/rate');
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(payload);
      req.flush({ is_success: true, message: 'Content rated successfully.' });
      const res = await promise;
      expect(res.is_success).toBe(true);
    });

    it('maps a 403 into a permissions error', async () => {
      const promise = service.rateContent({ content_id: 'c-1', user_id: 'u-1', rating: 5 });
      httpMock
        .expectOne('/content/rate')
        .flush({ detail: 'x' }, { status: 403, statusText: 'Forbidden' });
      await expect(promise).rejects.toThrow('No tienes permisos para esta acción');
    });
  });

  describe('getRatingsByUser', () => {
    it('GETs /content/ratings/all with the user_id and returns the details', async () => {
      const promise = service.getRatingsByUser('u-1');
      const req = httpMock.expectOne((r) => r.url === '/content/ratings/all');
      expect(req.request.method).toBe('GET');
      expect(req.request.params.get('user_id')).toBe('u-1');
      const detail = { content_id: 'c-1', title: 'T', summary: 'S', rating: 4, student_id: 'u-1' };
      req.flush({ is_success: true, message: 'ok', rating_details: [detail] });
      expect(await promise).toEqual([detail]);
    });

    it('returns an empty list on 404 (no ratings yet)', async () => {
      const promise = service.getRatingsByUser('u-1');
      httpMock
        .expectOne((r) => r.url === '/content/ratings/all')
        .flush({ detail: 'x' }, { status: 404, statusText: 'Not Found' });
      expect(await promise).toEqual([]);
    });

    it('maps other errors', async () => {
      const promise = service.getRatingsByUser('u-1');
      httpMock
        .expectOne((r) => r.url === '/content/ratings/all')
        .flush({ detail: 'x' }, { status: 403, statusText: 'Forbidden' });
      await expect(promise).rejects.toThrow('No tienes permisos para esta acción');
    });
  });

  describe('updateResourceStatus', () => {
    it('PUTs the content id and the new status to /content/update/status', async () => {
      const promise = service.updateResourceStatus('c-12345', false);
      const req = httpMock.expectOne('/content/update/status');
      expect(req.request.method).toBe('PUT');
      expect(req.request.body).toEqual({ content_id: 'c-12345', status: false });
      req.flush({ is_success: true, message: 'ok', content_id: 'c-12345', new_status: false });
      const res = await promise;
      expect(res.is_success).toBe(true);
      expect(res.new_status).toBe(false);
    });

    it('maps a 403 into a permissions error', async () => {
      const promise = service.updateResourceStatus('c-12345', false);
      httpMock
        .expectOne('/content/update/status')
        .flush({ detail: 'x' }, { status: 403, statusText: 'Forbidden' });
      await expect(promise).rejects.toThrow('No tienes permisos para esta acción');
    });
  });

  describe('top content', () => {
    const item = { content_id: 'c-1', title: 'T', summary: 'S', rating: 4.8 };

    it('GETs the best content of a topic with the limit in the path', async () => {
      const promise = service.getTopBestContent('APIs', 3);
      const req = httpMock.expectOne((r) => r.url === '/content/top-content/best/3');
      expect(req.request.method).toBe('GET');
      expect(req.request.params.get('topic')).toBe('APIs');
      req.flush({ is_success: true, message: 'ok', items: [item] });
      expect(await promise).toEqual([item]);
    });

    it('GETs the worst content of a topic (limit defaults to 5)', async () => {
      const promise = service.getTopWorseContent('APIs');
      const req = httpMock.expectOne((r) => r.url === '/content/top-content/worse/5');
      expect(req.request.params.get('topic')).toBe('APIs');
      req.flush({ is_success: true, message: 'ok', items: [item] });
      expect(await promise).toEqual([item]);
    });

    it('returns an empty list on 404 (no rated content for the topic)', async () => {
      const promise = service.getTopBestContent('APIs');
      httpMock
        .expectOne((r) => r.url === '/content/top-content/best/5')
        .flush({ detail: 'x' }, { status: 404, statusText: 'Not Found' });
      expect(await promise).toEqual([]);
    });

    it('defaults to an empty list when items is missing', async () => {
      const promise = service.getTopWorseContent('APIs');
      httpMock
        .expectOne((r) => r.url === '/content/top-content/worse/5')
        .flush({ is_success: true, message: 'ok' });
      expect(await promise).toEqual([]);
    });

    it('maps other errors', async () => {
      const promise = service.getTopBestContent('APIs');
      httpMock
        .expectOne((r) => r.url === '/content/top-content/best/5')
        .flush({}, { status: 401, statusText: 'Unauthorized' });
      await expect(promise).rejects.toThrow('Sesión expirada, inicia sesión de nuevo');
    });
  });

  describe('updateRating', () => {
    it('PUTs the payload to /content/modify/rating', async () => {
      const payload = { content_id: 'c-1', user_id: 'u-1', rating: 5 };
      const promise = service.updateRating(payload);
      const req = httpMock.expectOne('/content/modify/rating');
      expect(req.request.method).toBe('PUT');
      expect(req.request.body).toEqual(payload);
      req.flush({ is_success: true, message: 'Rating updated successfully' });
      expect((await promise).is_success).toBe(true);
    });

    it('maps a 422 into an invalid data error', async () => {
      const promise = service.updateRating({ content_id: 'c-1', user_id: 'u-1', rating: 9 });
      httpMock.expectOne('/content/modify/rating').flush({}, { status: 422, statusText: 'x' });
      await expect(promise).rejects.toThrow('Datos inválidos');
    });
  });

  describe('missing fields', () => {
    it('getAllContentsPaged defaults to an empty page', async () => {
      const promise = service.getAllContentsPaged();
      httpMock
        .expectOne((r) => r.url === '/content/')
        .flush({ is_success: true, message: 'ok' });
      expect(await promise).toEqual({ items: [], total: 0 });
    });

    it('a search defaults to an empty page when items and total are missing', async () => {
      const promise = service.getContentsByTitle('Intro');
      httpMock
        .expectOne((r) => r.url === '/content/title/Intro')
        .flush({ is_success: true, message: 'ok' });
      expect(await promise).toEqual({ items: [], total: 0 });
    });

    it('getContentById returns null when the response has no content', async () => {
      const promise = service.getContentById('c-1');
      httpMock.expectOne('/content/c-1').flush({ is_success: true, message: 'ok', content: null });
      expect(await promise).toBeNull();
    });
  });

  describe('error mapping', () => {
    it.each([
      [0, 'Sin conexión al servidor'],
      [401, 'Sesión expirada, inicia sesión de nuevo'],
      [403, 'No tienes permisos para esta acción'],
      [422, 'Datos inválidos'],
      [500, 'Error en el servidor, intenta más tarde'],
    ])('maps HTTP %i to "%s"', async (status, message) => {
      const promise = service.getCompleteLearningPaths('u1');
      httpMock
        .expectOne((r) => r.url === '/content/complete/path')
        .flush({ detail: 'x' }, { status, statusText: 'error' });
      await expect(promise).rejects.toThrow(message);
    });

    it('getContentById still throws on errors other than 404', async () => {
      const promise = service.getContentById('c-1');
      httpMock.expectOne('/content/c-1').flush({ detail: 'x' }, { status: 500, statusText: 'error' });
      await expect(promise).rejects.toThrow('Error en el servidor, intenta más tarde');
    });

    it.each([
      ['getContentsByTopic', '/content/topic/APIs', () => service.getContentsByTopic('APIs')],
      ['getContentsByCategory', '/content/category/x', () => service.getContentsByCategory('x')],
      ['getContentsByTitle', '/content/title/Intro', () => service.getContentsByTitle('Intro')],
      [
        'getContentsByCategoryTopic',
        '/content/category-topic/x/APIs',
        () => service.getContentsByCategoryTopic('x', 'APIs'),
      ],
    ] as [string, string, () => Promise<unknown>][])(
      '%s still throws on errors other than 404',
      async (_name, url, call) => {
        const promise = call();
        httpMock.expectOne((r) => r.url === url).flush({ detail: 'x' }, { status: 403, statusText: 'Forbidden' });
        await expect(promise).rejects.toThrow('No tienes permisos para esta acción');
      },
    );

    it('getAllContentsPaged rejects with the mapped error', async () => {
      const promise = service.getAllContentsPaged();
      httpMock
        .expectOne((r) => r.url === '/content/')
        .flush({ detail: 'x' }, { status: 401, statusText: 'Unauthorized' });
      await expect(promise).rejects.toThrow('Sesión expirada, inicia sesión de nuevo');
    });

    it('updateContent rejects with the mapped error', async () => {
      const promise = service.updateContent('c-1', {
        title: 'Un recurso',
        description: 'descripción válida',
        url: 'https://ejemplo.com',
        category: 'principiante',
        related_topic: ['APIs'],
      });
      httpMock.expectOne('/content/c-1').flush({ detail: 'x' }, { status: 422, statusText: 'Unprocessable' });
      await expect(promise).rejects.toThrow('Datos inválidos');
    });

    it('keeps an Error that did not come from HTTP and names unknown failures', () => {
      const map = (service as unknown as { mapHttpError(e: unknown): Error }).mapHttpError.bind(service);
      const original = new Error('propio');
      expect(map(original)).toBe(original);
      expect(map('boom').message).toBe('Error desconocido');
    });
  });
});
