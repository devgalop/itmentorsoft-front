import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { ResourcesComponent } from './resources.component';
import { ContentService } from '../../../core/content/content.service';

describe('ResourcesComponent', () => {
  let serviceMock: {
    getAllContents: ReturnType<typeof vi.fn>;
    registerContent: ReturnType<typeof vi.fn>;
  };

  function createComponent(): ResourcesComponent {
    TestBed.configureTestingModule({
      providers: [ResourcesComponent, { provide: ContentService, useValue: serviceMock }],
    });
    return TestBed.inject(ResourcesComponent);
  }

  beforeEach(() => {
    serviceMock = {
      getAllContents: vi.fn().mockResolvedValue([]),
      registerContent: vi.fn(),
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
    serviceMock.getAllContents.mockResolvedValue([
      { content_id: 'c1', title: 'R', summary: 's', url: 'https://x.com', category: 'novice', related_topics: [] },
    ]);
    const component = createComponent();
    await Promise.resolve();
    await Promise.resolve();
    expect(serviceMock.getAllContents).toHaveBeenCalled();
    expect(component.resources()).toHaveLength(1);
  });

  it('starts with one topic and is invalid when empty', () => {
    const component = createComponent();
    expect(component.topics.length).toBe(1);
    expect(component.form.valid).toBe(false);
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
  });

  it('creates a resource, closes the modal and reloads the list', async () => {
    serviceMock.registerContent.mockResolvedValue({ is_success: true, content_id: 'c-1', message: 'Creado' });
    const component = createComponent();
    await Promise.resolve();
    fillValid(component);
    component.openModal();

    await component.submit();

    expect(serviceMock.registerContent).toHaveBeenCalledTimes(1);
    const payload = serviceMock.registerContent.mock.calls[0][0];
    expect(payload.url).toBe('https://ejemplo.com');
    expect(payload.related_topic).toEqual(['APIs']);
    expect(component.submitSuccess()).toBe('Creado');
    expect(component.isModalOpen()).toBe(false);
    // getAllContents: 1 en el constructor + 1 tras crear
    expect(serviceMock.getAllContents).toHaveBeenCalledTimes(2);
  });

  it('shows an error when registerContent responds is_success false', async () => {
    serviceMock.registerContent.mockResolvedValue({ is_success: false, message: 'Rechazado' });
    const component = createComponent();
    fillValid(component);

    await component.submit();

    expect(component.submitError()).toBe('Rechazado');
  });
});
