import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { AdminResourcesComponent } from './admin-resources.component';
import { ContentService } from '../../../core/content/content.service';
import { ToastService } from '../../../shared/ui/toast/toast.service';

describe('AdminResourcesComponent', () => {
  let contentMock: {
    getAllContentsPaged: ReturnType<typeof vi.fn>;
    updateResourceStatus: ReturnType<typeof vi.fn>;
  };
  const toastMock = { success: vi.fn(), error: vi.fn(), info: vi.fn(), warning: vi.fn() };

  function item(id: string) {
    return {
      content_id: id,
      title: 'Recurso ' + id,
      summary: 'Resumen',
      url: 'https://example.com/' + id,
      category: 'básico',
      related_topics: ['APIs'],
    };
  }

  async function createComponent(
    items: string[] = ['c1', 'c2'],
    total = items.length,
  ): Promise<AdminResourcesComponent> {
    contentMock.getAllContentsPaged.mockResolvedValue({ items: items.map(item), total });
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        AdminResourcesComponent,
        { provide: ContentService, useValue: contentMock },
        { provide: ToastService, useValue: toastMock },
      ],
    });
    const component = TestBed.inject(AdminResourcesComponent);
    await vi.waitFor(() => expect(component.isLoading()).toBe(false));
    return component;
  }

  beforeEach(() => {
    contentMock = {
      getAllContentsPaged: vi.fn(),
      updateResourceStatus: vi
        .fn()
        .mockResolvedValue({ is_success: true, message: 'ok', content_id: 'c1', new_status: false }),
    };
    toastMock.success.mockClear();
    toastMock.error.mockClear();
  });

  it('loads the first page of resources', async () => {
    const c = await createComponent(['c1', 'c2'], 12);
    expect(contentMock.getAllContentsPaged).toHaveBeenCalledWith(0, 10);
    expect(c.resources()).toHaveLength(2);
    expect(c.total()).toBe(12);
    expect(c.totalPages()).toBe(2);
  });

  it('shows the error message when loading fails', async () => {
    contentMock.getAllContentsPaged.mockRejectedValue(new Error('Sin conexión al servidor'));
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        AdminResourcesComponent,
        { provide: ContentService, useValue: contentMock },
        { provide: ToastService, useValue: toastMock },
      ],
    });
    const c = TestBed.inject(AdminResourcesComponent);
    await vi.waitFor(() => expect(c.loadError()).toBe('Sin conexión al servidor'));
    expect(c.resources()).toEqual([]);
  });

  it('paginates forward and backward', async () => {
    const c = await createComponent(['c1'], 25);
    await c.nextPage();
    expect(contentMock.getAllContentsPaged).toHaveBeenLastCalledWith(1, 10);
    expect(c.page()).toBe(1);
    await c.prevPage();
    expect(contentMock.getAllContentsPaged).toHaveBeenLastCalledWith(0, 10);
    await c.prevPage();
    expect(c.page()).toBe(0);
  });

  it('maps the category label', async () => {
    const c = await createComponent();
    expect(c.categoryLabel('básico')).toBe('Básico');
  });

  it('asks for confirmation first and can cancel without calling the backend', async () => {
    const c = await createComponent();
    c.askDisable('c1');
    expect(c.confirmingResource()?.title).toBe('Recurso c1');
    c.cancelDisable();
    expect(c.confirmingId()).toBeNull();
    expect(contentMock.updateResourceStatus).not.toHaveBeenCalled();
  });

  it('Escape closes the confirmation modal', async () => {
    const c = await createComponent();
    c.askDisable('c1');
    c.onEscape();
    expect(c.confirmingId()).toBeNull();
  });

  it('disables the resource, notifies and reloads the current page', async () => {
    const c = await createComponent(['c1', 'c2'], 2);
    contentMock.getAllContentsPaged.mockClear();
    c.askDisable('c1');

    await c.disableResource('c1');

    expect(contentMock.updateResourceStatus).toHaveBeenCalledWith('c1', false);
    expect(toastMock.success).toHaveBeenCalled();
    expect(contentMock.getAllContentsPaged).toHaveBeenCalledWith(0, 10);
    expect(c.confirmingId()).toBeNull();
    expect(c.disablingId()).toBeNull();
  });

  it('goes back one page when the last resource of a page is disabled', async () => {
    const c = await createComponent(['c1'], 11);
    await c.nextPage();
    contentMock.getAllContentsPaged.mockClear();

    await c.disableResource('c1');

    expect(contentMock.getAllContentsPaged).toHaveBeenCalledWith(0, 10);
  });

  it('shows an error toast and keeps the modal data when the backend rejects the change', async () => {
    contentMock.updateResourceStatus.mockRejectedValue(new Error('No tenés permisos para esta acción'));
    const c = await createComponent();
    contentMock.getAllContentsPaged.mockClear();

    await c.disableResource('c1');

    expect(toastMock.error).toHaveBeenCalledWith(
      'No se pudo desactivar el recurso',
      'No tenés permisos para esta acción',
    );
    expect(contentMock.getAllContentsPaged).not.toHaveBeenCalled();
    expect(c.disablingId()).toBeNull();
  });

  it('treats is_success false as an error', async () => {
    contentMock.updateResourceStatus.mockResolvedValue({
      is_success: false,
      message: 'No se pudo actualizar',
      content_id: '',
      new_status: false,
    });
    const c = await createComponent();

    await c.disableResource('c1');

    expect(toastMock.error).toHaveBeenCalledWith('No se pudo desactivar el recurso', 'No se pudo actualizar');
    expect(toastMock.success).not.toHaveBeenCalled();
  });

  it('cannot cancel while the resource is being disabled', async () => {
    const c = await createComponent();
    let release!: (v: unknown) => void;
    contentMock.updateResourceStatus.mockReturnValue(new Promise((r) => (release = r)));
    c.askDisable('c1');

    const pending = c.disableResource('c1');
    c.cancelDisable();
    c.onEscape();
    expect(c.confirmingId()).toBe('c1');

    release({ is_success: true, message: 'ok', content_id: 'c1', new_status: false });
    await pending;
    expect(c.confirmingId()).toBeNull();
  });

  it('ignores a second disable while one is in progress', async () => {
    const c = await createComponent();
    let release!: (v: unknown) => void;
    contentMock.updateResourceStatus.mockReturnValue(new Promise((r) => (release = r)));

    const first = c.disableResource('c1');
    await c.disableResource('c2');
    expect(contentMock.updateResourceStatus).toHaveBeenCalledTimes(1);

    release({ is_success: true, message: 'ok', content_id: 'c1', new_status: false });
    await first;
  });
});
