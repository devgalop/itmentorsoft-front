import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { ResourcesComponent } from './resources.component';
import { ContentService } from '../../../core/content/content.service';

const existing = {
  content_id: 'c1',
  title: 'Recurso existente',
  summary: 'Resumen del recurso',
  url: 'https://viejo.com',
  category: 'average',
  related_topics: ['SOLID', 'Patrones'],
};

describe('ResourcesComponent', () => {
  let serviceMock: {
    getAllContents: ReturnType<typeof vi.fn>;
    registerContent: ReturnType<typeof vi.fn>;
    updateContent: ReturnType<typeof vi.fn>;
  };

  function createComponent(): ResourcesComponent {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [ResourcesComponent, { provide: ContentService, useValue: serviceMock }],
    });
    return TestBed.inject(ResourcesComponent);
  }

  beforeEach(() => {
    serviceMock = {
      getAllContents: vi.fn().mockResolvedValue([]),
      registerContent: vi.fn(),
      updateContent: vi.fn(),
    };
  });

  function fillValid(component: ResourcesComponent): void {
    component.form.patchValue({
      title: 'Recurso de prueba',
      description: 'Una descripción válida',
      url: 'https://ejemplo.com',
      category: 'novice',
    });
    component.topics.at(0).setValue('APIs');
  }

  it('loads resources on creation', async () => {
    serviceMock.getAllContents.mockResolvedValue([existing]);
    const component = createComponent();
    await Promise.resolve();
    await Promise.resolve();
    expect(serviceMock.getAllContents).toHaveBeenCalled();
    expect(component.resources()).toHaveLength(1);
  });

  it('rejects a url that does not start with https://', () => {
    const component = createComponent();
    fillValid(component);
    component.form.get('url')?.setValue('http://inseguro.com');
    expect(component.form.get('url')?.valid).toBe(false);
  });

  it('adds and removes topics but never below 1', () => {
    const component = createComponent();
    component.addTopic();
    expect(component.topics.length).toBe(2);
    component.removeTopic(1);
    expect(component.topics.length).toBe(1);
    component.removeTopic(0);
    expect(component.topics.length).toBe(1);
  });

  it('does not submit when invalid', async () => {
    const component = createComponent();
    await component.submit();
    expect(serviceMock.registerContent).not.toHaveBeenCalled();
    expect(serviceMock.updateContent).not.toHaveBeenCalled();
  });

  it('creates a resource via registerContent and reloads', async () => {
    serviceMock.registerContent.mockResolvedValue({ is_success: true, message: 'Creado' });
    const component = createComponent();
    await Promise.resolve();
    component.openCreate();
    fillValid(component);

    await component.submit();

    expect(serviceMock.registerContent).toHaveBeenCalledTimes(1);
    expect(serviceMock.updateContent).not.toHaveBeenCalled();
    expect(component.submitSuccess()).toBe('Creado');
    expect(component.isModalOpen()).toBe(false);
    expect(serviceMock.getAllContents).toHaveBeenCalledTimes(2);
  });

  it('openEdit preloads the form mapping summary -> description', () => {
    const component = createComponent();

    component.openEdit(existing);

    expect(component.editingId()).toBe('c1');
    expect(component.isModalOpen()).toBe(true);
    expect(component.form.get('title')?.value).toBe('Recurso existente');
    expect(component.form.get('description')?.value).toBe('Resumen del recurso');
    expect(component.form.get('category')?.value).toBe('average');
    expect(component.topics.length).toBe(2);
    expect(component.topics.at(0).value).toBe('SOLID');
  });

  it('updates via updateContent when editing', async () => {
    serviceMock.updateContent.mockResolvedValue({ is_success: true, message: 'Actualizado' });
    const component = createComponent();
    await Promise.resolve();
    component.openEdit(existing);

    await component.submit();

    expect(serviceMock.updateContent).toHaveBeenCalledTimes(1);
    expect(serviceMock.updateContent.mock.calls[0][0]).toBe('c1');
    expect(serviceMock.registerContent).not.toHaveBeenCalled();
    expect(component.submitSuccess()).toBe('Actualizado');
    expect(component.editingId()).toBeNull();
  });

  it('openCreate clears the editing state', () => {
    const component = createComponent();
    component.openEdit(existing);
    expect(component.editingId()).toBe('c1');

    component.openCreate();

    expect(component.editingId()).toBeNull();
    expect(component.form.get('title')?.value).toBe('');
  });

  it('shows an error when the backend responds is_success false', async () => {
    serviceMock.registerContent.mockResolvedValue({ is_success: false, message: 'Rechazado' });
    const component = createComponent();
    component.openCreate();
    fillValid(component);

    await component.submit();

    expect(component.submitError()).toBe('Rechazado');
  });
});
