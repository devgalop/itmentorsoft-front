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
