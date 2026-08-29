import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { UsersService } from './users.service';

describe('UsersService', () => {
  let service: UsersService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [UsersService, provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(UsersService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  describe('getAvailableRoles', () => {
    it('GETs available-roles and returns the roles array', async () => {
      const promise = service.getAvailableRoles();
      const req = httpMock.expectOne('/users/available-roles');
      expect(req.request.method).toBe('GET');
      req.flush({ is_success: true, roles: ['admin', 'teacher', 'student'] });
      expect(await promise).toEqual(['admin', 'teacher', 'student']);
    });

    it('returns an empty array when roles is missing', async () => {
      const promise = service.getAvailableRoles();
      httpMock.expectOne('/users/available-roles').flush({ is_success: true });
      expect(await promise).toEqual([]);
    });
  });

  describe('getConnectedTotal', () => {
    it('GETs connected/total and returns the count', async () => {
      const promise = service.getConnectedTotal();
      const req = httpMock.expectOne('/users/connected/total');
      expect(req.request.method).toBe('GET');
      req.flush({ is_success: true, message: 'ok', total_users: 7 });
      expect(await promise).toBe(7);
    });

    it('returns 0 when total_users is missing', async () => {
      const promise = service.getConnectedTotal();
      httpMock.expectOne('/users/connected/total').flush({ is_success: true, message: 'ok' });
      expect(await promise).toBe(0);
    });
  });

  describe('getUser', () => {
    it('GETs the encoded user id and returns the user', async () => {
      const promise = service.getUser('abc-123');
      const req = httpMock.expectOne('/users/abc-123');
      expect(req.request.method).toBe('GET');
      const user = { user_id: 'abc-123', username: 'eider', email: 'e@itm.co', role: 'student' };
      req.flush({ is_success: true, message: 'ok', user });
      expect(await promise).toEqual(user);
    });

    it('returns null when the user is not found', async () => {
      const promise = service.getUser('missing');
      httpMock.expectOne('/users/missing').flush({ is_success: false, message: 'not found', user: null });
      expect(await promise).toBeNull();
    });

    it('maps a 404 into a not-found error', async () => {
      const promise = service.getUser('x');
      httpMock.expectOne('/users/x').flush({ detail: 'nf' }, { status: 404, statusText: 'Not Found' });
      await expect(promise).rejects.toThrow('No se encontró el usuario');
    });
  });

  describe('assignRole', () => {
    it('PUTs assign-role with user_id and role in the body', async () => {
      const promise = service.assignRole('abc-123', 'teacher');
      const req = httpMock.expectOne('/users/assign-role');
      expect(req.request.method).toBe('PUT');
      expect(req.request.body).toEqual({ user_id: 'abc-123', role: 'teacher' });
      req.flush({ is_success: true, message: 'Role assigned successfully.' });
      const res = await promise;
      expect(res.is_success).toBe(true);
    });

    it('maps a 403 into a permissions error', async () => {
      const promise = service.assignRole('abc-123', 'teacher');
      httpMock
        .expectOne('/users/assign-role')
        .flush({ detail: 'forbidden' }, { status: 403, statusText: 'Forbidden' });
      await expect(promise).rejects.toThrow('No tenés permisos para esta acción');
    });
  });

  describe('createUser', () => {
    const payload = { email: 'nuevo@itm.co', username: 'nuevo_user', role: 'teacher' };

    it('POSTs the payload to create_user_from_admin', async () => {
      const promise = service.createUser(payload);
      const req = httpMock.expectOne('/users/create_user_from_admin');
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(payload);
      req.flush({ is_success: true, message: 'creado', user_id: 'u-1' });
      const res = await promise;
      expect(res.is_success).toBe(true);
      expect(res.user_id).toBe('u-1');
    });

    it('maps a 400 into a validation error', async () => {
      const promise = service.createUser(payload);
      httpMock
        .expectOne('/users/create_user_from_admin')
        .flush({ detail: 'bad' }, { status: 400, statusText: 'Bad Request' });
      await expect(promise).rejects.toThrow('Datos inválidos');
    });
  });
});
