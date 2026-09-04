import { TestBed } from '@angular/core/testing';
import { ElementRef } from '@angular/core';
import { vi } from 'vitest';
import { ResourcesComponent } from './resources.component';
import { ContentService } from '../../../core/content/content.service';
import { AssessmentsService } from '../../../core/assessments/assessments.service';
import { ToastService } from '../../../shared/ui/toast/toast.service';

const CATEGORIES = ['APIs', 'SOLID', 'Patrones', 'Arquitectura'];

const existing = {
  content_id: 'c1',
  title: 'Recurso existente',
  summary: 'Resumen del recurso',
  url: 'https://viejo.com',
  category: 'intermedio',
  related_topics: ['SOLID', 'Patrones'],
};

const toastMock = { success: vi.fn(), error: vi.fn(), info: vi.fn(), warning: vi.fn() };
afterEach(() => { toastMock.success.mockClear(); toastMock.error.mockClear(); });

describe('ResourcesComponent', () => {
  let serviceMock: {
    getAllContents: ReturnType<typeof vi.fn>;
    registerContent: ReturnType<typeof vi.fn>;
    updateContent: ReturnType<typeof vi.fn>;
  };
  let assessmentsMock: { getTopics: ReturnType<typeof vi.fn> };

  function createComponent(): ResourcesComponent {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        ResourcesComponent,
        { provide: ContentService, useValue: serviceMock },
        { provide: AssessmentsService, useValue: assessmentsMock },
        { provide: ToastService, useValue: toastMock },
        { provide: ElementRef, useValue: { nativeElement: document.createElement('div') } },
      ],
    });
    return TestBed.inject(ResourcesComponent);
  }

  beforeEach(() => {
    serviceMock = {
      getAllContents: vi.fn().mockResolvedValue([]),
      registerContent: vi.fn(),
      updateContent: vi.fn(),
    };
    assessmentsMock = { getTopics: vi.fn().mockResolvedValue(CATEGORIES) };
  });

  function fillValid(component: ResourcesComponent): void {
    component.form.patchValue({
      title: 'Recurso de prueba',
      description: 'Una descripción válida',
      url: 'https://ejemplo.com',
      category: 'principiante',
    });
    component.toggleTopic('APIs');
  }

  it('loads resources and available categories on creation', async () => {
    serviceMock.getAllContents.mockResolvedValue([existing]);
    const component = createComponent();
    await Promise.resolve();
    await Promise.resolve();
    expect(serviceMock.getAllContents).toHaveBeenCalled();
    expect(assessmentsMock.getTopics).toHaveBeenCalled();
    expect(component.resources()).toHaveLength(1);
    expect(component.availableTopics()).toEqual(CATEGORIES);
  });

  it('rejects a url that does not start with https://', () => {
    const component = createComponent();
    fillValid(component);
    component.form.get('url')?.setValue('http://inseguro.com');
    expect(component.form.get('url')?.valid).toBe(false);
  });

  it('toggles categories on and off', () => {
    const component = createComponent();
    expect(component.isTopicSelected('SOLID')).toBe(false);
    component.toggleTopic('SOLID');
    expect(component.isTopicSelected('SOLID')).toBe(true);
    expect(component.selectedTopics()).toEqual(['SOLID']);
    component.toggleTopic('SOLID');
    expect(component.isTopicSelected('SOLID')).toBe(false);
    expect(component.selectedTopics()).toEqual([]);
  });

  it('is invalid when no category is selected', () => {
    const component = createComponent();
    component.form.patchValue({
      title: 'Recurso de prueba',
      description: 'Una descripción válida',
      url: 'https://ejemplo.com',
      category: 'principiante',
    });
    // sin categorías marcadas -> inválido
    expect(component.form.valid).toBe(false);
    component.toggleTopic('APIs');
    expect(component.form.valid).toBe(true);
  });

  it('does not submit when invalid', async () => {
    const component = createComponent();
    await component.submit();
    expect(serviceMock.registerContent).not.toHaveBeenCalled();
    expect(serviceMock.updateContent).not.toHaveBeenCalled();
  });

  it('creates a resource via registerContent with the selected categories', async () => {
    serviceMock.registerContent.mockResolvedValue({ is_success: true, message: 'Creado' });
    const component = createComponent();
    await Promise.resolve();
    component.openCreate();
    fillValid(component);

    await component.submit();

    expect(serviceMock.registerContent).toHaveBeenCalledTimes(1);
    expect(serviceMock.registerContent.mock.calls[0][0].related_topic).toEqual(['APIs']);
    expect(serviceMock.updateContent).not.toHaveBeenCalled();
    expect(toastMock.success).toHaveBeenCalledWith('Recurso creado', expect.any(String));
    expect(component.isModalOpen()).toBe(false);
  });

  it('openEdit preloads the form and checks the resource categories', () => {
    const component = createComponent();

    component.openEdit(existing);

    expect(component.editingId()).toBe('c1');
    expect(component.isModalOpen()).toBe(true);
    expect(component.form.get('title')?.value).toBe('Recurso existente');
    expect(component.form.get('description')?.value).toBe('Resumen del recurso');
    expect(component.form.get('category')?.value).toBe('intermedio');
    expect(component.selectedTopics()).toEqual(['SOLID', 'Patrones']);
    expect(component.isTopicSelected('SOLID')).toBe(true);
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
    expect(toastMock.success).toHaveBeenCalledWith('Recurso actualizado', expect.any(String));
    expect(component.editingId()).toBeNull();
  });

  it('openCreate clears the editing state and selected categories', () => {
    const component = createComponent();
    component.openEdit(existing);
    expect(component.editingId()).toBe('c1');

    component.openCreate();

    expect(component.editingId()).toBeNull();
    expect(component.form.get('title')?.value).toBe('');
    expect(component.selectedTopics()).toEqual([]);
  });

  it('toggles the topics dropdown open and closed', () => {
    const component = createComponent();
    expect(component.isTopicsOpen()).toBe(false);
    component.toggleTopicsDropdown();
    expect(component.isTopicsOpen()).toBe(true);
    component.toggleTopicsDropdown();
    expect(component.isTopicsOpen()).toBe(false);
  });

  it('summarizes the selected topics for the trigger label', () => {
    const component = createComponent();
    expect(component.topicsSummary()).toBe('Seleccioná uno o más temas');
    component.toggleTopic('APIs');
    expect(component.topicsSummary()).toBe('APIs');
    component.toggleTopic('SOLID');
    expect(component.topicsSummary()).toBe('2 temas seleccionados');
  });

  it('shows an error when the backend responds is_success false', async () => {
    serviceMock.registerContent.mockResolvedValue({ is_success: false, message: 'Rechazado' });
    const component = createComponent();
    component.openCreate();
    fillValid(component);

    await component.submit();

    expect(toastMock.error).toHaveBeenCalledWith('No se pudo guardar', 'Rechazado');
  });
});
