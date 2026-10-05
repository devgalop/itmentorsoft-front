import { ComponentFixture, TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { QuestionVersionsComponent } from './question-versions.component';
import { AssessmentsService } from '../../../core/assessments/assessments.service';

describe('QuestionVersionsComponent', () => {
  let fixture: ComponentFixture<QuestionVersionsComponent>;
  let serviceMock: { getQuestionVersions: ReturnType<typeof vi.fn> };

  function version(id: string, n: number, status = 'published') {
    return { question_id: id, text_to_evaluate: 'texto ' + id, version: n, status };
  }

  function setup(id = 'q2'): QuestionVersionsComponent {
    TestBed.configureTestingModule({
      imports: [QuestionVersionsComponent],
      providers: [{ provide: AssessmentsService, useValue: serviceMock }],
    });
    fixture = TestBed.createComponent(QuestionVersionsComponent);
    fixture.componentRef.setInput('questionId', id);
    fixture.detectChanges();
    return fixture.componentInstance;
  }

  beforeEach(() => {
    serviceMock = {
      getQuestionVersions: vi
        .fn()
        .mockResolvedValue([version('q2', 2), version('q1', 1, 'archived')]),
    };
  });

  it('does not load anything until the panel is opened', () => {
    const c = setup();
    expect(c.isOpen()).toBe(false);
    expect(serviceMock.getQuestionVersions).not.toHaveBeenCalled();
  });

  it('loads the versions the first time it is opened and marks the latest', async () => {
    const c = setup();
    c.toggle();
    await vi.waitFor(() => expect(c.versions()).toHaveLength(2));
    expect(serviceMock.getQuestionVersions).toHaveBeenCalledWith('q2');
    expect(c.latest()).toBe(2);
    expect(c.isLoading()).toBe(false);
  });

  it('does not reload when it is closed and opened again', async () => {
    const c = setup();
    c.toggle();
    await vi.waitFor(() => expect(c.versions()).toHaveLength(2));
    c.toggle();
    c.toggle();
    expect(serviceMock.getQuestionVersions).toHaveBeenCalledTimes(1);
  });

  it('keeps the list when the viewed id belongs to the same chain', async () => {
    const c = setup('q2');
    c.toggle();
    await vi.waitFor(() => expect(c.versions()).toHaveLength(2));
    fixture.componentRef.setInput('questionId', 'q1');
    fixture.detectChanges();
    expect(c.versions()).toHaveLength(2);
    expect(serviceMock.getQuestionVersions).toHaveBeenCalledTimes(1);
  });

  it('reloads when the viewed id is from another question and the panel is open', async () => {
    const c = setup('q2');
    c.toggle();
    await vi.waitFor(() => expect(c.versions()).toHaveLength(2));
    serviceMock.getQuestionVersions.mockResolvedValue([version('z1', 1)]);
    fixture.componentRef.setInput('questionId', 'z1');
    fixture.detectChanges();
    await vi.waitFor(() => expect(c.versions().map((v) => v.question_id)).toEqual(['z1']));
  });

  it('shows the error message when loading fails', async () => {
    serviceMock.getQuestionVersions.mockRejectedValue(new Error('Sesión expirada, inicia sesión de nuevo'));
    const c = setup();
    c.toggle();
    await vi.waitFor(() => expect(c.error()).toBe('Sesión expirada, inicia sesión de nuevo'));
    expect(c.versions()).toEqual([]);
    expect(c.isLoading()).toBe(false);
  });

  it('emits the id of the chosen version', async () => {
    const c = setup('q2');
    const emitted: string[] = [];
    c.select.subscribe((id) => emitted.push(id));
    c.toggle();
    await vi.waitFor(() => expect(c.versions()).toHaveLength(2));
    fixture.detectChanges();
    const buttons = (fixture.nativeElement as HTMLElement).querySelectorAll<HTMLButtonElement>('.ver__view');
    expect(buttons).toHaveLength(1);
    buttons[0]!.click();
    expect(emitted).toEqual(['q1']);
  });

  it('labels the statuses in Spanish', () => {
    const c = setup();
    expect(c.statusLabel('published')).toBe('Publicada');
    expect(c.statusLabel('draft')).toBe('Borrador');
    expect(c.statusLabel('archived')).toBe('Archivada');
    expect(c.statusLabel(null)).toBe('Sin estado');
    expect(c.statusLabel('otro')).toBe('otro');
  });
});
