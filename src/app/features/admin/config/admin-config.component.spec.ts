import { ComponentFixture, TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { AdminConfigComponent } from './admin-config.component';
import { AssessmentsService } from '../../../core/assessments/assessments.service';
import { ToastService } from '../../../shared/ui/toast/toast.service';

async function flush(times = 5): Promise<void> {
  for (let i = 0; i < times; i++) {
    await Promise.resolve();
  }
}

describe('AdminConfigComponent', () => {
  let fixture: ComponentFixture<AdminConfigComponent>;
  let assessmentsMock: {
    getAvailableModels: ReturnType<typeof vi.fn>;
    getModelSelected: ReturnType<typeof vi.fn>;
    updateModel: ReturnType<typeof vi.fn>;
  };
  let toastMock: { success: ReturnType<typeof vi.fn>; error: ReturnType<typeof vi.fn> };

  function setup(opts?: {
    models?: string[];
    selected?: { process: string; model_id: string }[];
    loadReject?: Error;
    updateResponse?: { is_success: boolean; message: string };
    updateReject?: Error;
  }): void {
    assessmentsMock = {
      getAvailableModels: opts?.loadReject
        ? vi.fn().mockRejectedValue(opts.loadReject)
        : vi.fn().mockResolvedValue(opts?.models ?? ['model_1', 'model_2']),
      getModelSelected: opts?.loadReject
        ? vi.fn().mockRejectedValue(opts.loadReject)
        : vi.fn().mockResolvedValue(opts?.selected ?? [{ process: 'qualifier', model_id: 'model_1' }]),
      updateModel: opts?.updateReject
        ? vi.fn().mockRejectedValue(opts.updateReject)
        : vi.fn().mockResolvedValue(opts?.updateResponse ?? { is_success: true, message: 'ok' }),
    };
    toastMock = { success: vi.fn(), error: vi.fn() };

    TestBed.configureTestingModule({
      imports: [AdminConfigComponent],
      providers: [
        { provide: AssessmentsService, useValue: assessmentsMock },
        { provide: ToastService, useValue: toastMock },
      ],
    });

    fixture = TestBed.createComponent(AdminConfigComponent);
    fixture.detectChanges();
  }

  it('creates successfully', () => {
    setup();
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('loads the available models and the currently selected model per process', async () => {
    setup({
      models: ['model_1', 'model_2'],
      selected: [
        { process: 'qualifier', model_id: 'model_1' },
        { process: 'classifier', model_id: 'model_2' },
      ],
    });
    await flush();

    const c = fixture.componentInstance;
    expect(c.availableModels()).toEqual(['model_1', 'model_2']);
    expect(c.processes().find((p) => p.process === 'qualifier')?.currentModel).toBe('model_1');
    expect(c.processes().find((p) => p.process === 'classifier')?.currentModel).toBe('model_2');
  });

  it('shows null currentModel for a process with no selection yet', async () => {
    setup({ selected: [] });
    await flush();

    const c = fixture.componentInstance;
    expect(c.processes().every((p) => p.currentModel === null)).toBe(true);
  });

  it('captures a load error', async () => {
    setup({ loadReject: new Error('Sin conexión al servidor') });
    await flush();
    expect(fixture.componentInstance.loadError()).toBe('Sin conexión al servidor');
  });

  it('updates the model for a process and shows a success toast', async () => {
    setup();
    await flush();

    await fixture.componentInstance.onModelChange('qualifier', 'model_2');

    expect(assessmentsMock.updateModel).toHaveBeenCalledWith('qualifier', 'model_2');
    expect(fixture.componentInstance.processes().find((p) => p.process === 'qualifier')?.currentModel).toBe(
      'model_2',
    );
    expect(toastMock.success).toHaveBeenCalled();
  });

  it('reverts the optimistic update and shows an error toast when the save fails', async () => {
    setup({
      selected: [{ process: 'qualifier', model_id: 'model_1' }],
      updateReject: new Error('No tenés permisos para esta acción'),
    });
    await flush();

    await fixture.componentInstance.onModelChange('qualifier', 'model_2');

    expect(fixture.componentInstance.processes().find((p) => p.process === 'qualifier')?.currentModel).toBe(
      'model_1',
    );
    expect(toastMock.error).toHaveBeenCalled();
  });
});
