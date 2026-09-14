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

  describe('getRecommendedLearningPaths', () => {
    it('GETs recommended learning paths with user_id and returns the recommendation', async () => {
      const promise = service.getRecommendedLearningPaths('user-123');
      const req = httpMock.expectOne(
        (r) =>
          r.url === '/content/recommended/learning-paths' &&
          r.params.get('user_id') === 'user-123',
      );
      expect(req.request.method).toBe('GET');
      const recommendation = [
        {
          topic: 'Arquitectura',
          contents: [
            { content_id: 'c1', title: 'Capas', description: 'Intro', rating: 4.5 },
          ],
        },
      ];
      req.flush({ is_success: true, message: 'ok', recommendation });
      expect(await promise).toEqual(recommendation);
    });

    it('returns [] when recommendation is missing', async () => {
      const promise = service.getRecommendedLearningPaths('user-123');
      httpMock
        .expectOne((r) => r.url === '/content/recommended/learning-paths')
        .flush({ is_success: true, message: 'ok' });
      expect(await promise).toEqual([]);
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
      await expect(promise).rejects.toThrow('No tenés permisos para esta acción');
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

});
