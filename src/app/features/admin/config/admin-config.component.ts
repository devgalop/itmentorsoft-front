import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { AssessmentsService } from '@core/assessments/assessments.service';
import { AiProcess, AI_PROCESSES } from '@core/assessments/assessments.types';
import { ToastService } from '@shared/ui/toast/toast.service';

interface ProcessConfig {
  process: AiProcess;
  label: string;
  currentModel: string | null;
}

/** Etiquetas legibles de cada proceso de IA configurable. */
const PROCESS_LABELS: Record<AiProcess, string> = {
  qualifier: 'Calificación de respuestas',
  classifier: 'Clasificación de estudiantes',
};

@Component({
  selector: 'app-admin-config',
  standalone: true,
  imports: [],
  templateUrl: './admin-config.component.html',
  styleUrl: './admin-config.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminConfigComponent {
  private readonly assessments = inject(AssessmentsService);
  private readonly toast = inject(ToastService);

  readonly availableModels = signal<string[]>([]);
  readonly processes = signal<ProcessConfig[]>(
    AI_PROCESSES.map((process) => ({ process, label: PROCESS_LABELS[process], currentModel: null })),
  );
  readonly isLoading = signal(true);
  readonly loadError = signal<string | null>(null);
  /** Proceso cuyo modelo se está guardando (para deshabilitar su select). */
  readonly savingProcess = signal<AiProcess | null>(null);

  constructor() {
    void this.load();
  }

  async load(): Promise<void> {
    this.isLoading.set(true);
    this.loadError.set(null);
    try {
      const [models, selected] = await Promise.all([
        this.assessments.getAvailableModels(),
        this.assessments.getModelSelected(),
      ]);
      this.availableModels.set(models);
      this.processes.set(
        AI_PROCESSES.map((process) => ({
          process,
          label: PROCESS_LABELS[process],
          currentModel: selected.find((m) => m.process === process)?.model_id ?? null,
        })),
      );
    } catch (error) {
      this.loadError.set(
        error instanceof Error ? error.message : 'No se pudo cargar la configuración de modelos.',
      );
    } finally {
      this.isLoading.set(false);
    }
  }

  async onModelChange(process: AiProcess, modelId: string): Promise<void> {
    if (!modelId || this.savingProcess()) return;
    const previous = this.processes();
    this.savingProcess.set(process);
    // Optimista: refleja el cambio de inmediato, se revierte si falla.
    this.processes.set(
      previous.map((p) => (p.process === process ? { ...p, currentModel: modelId } : p)),
    );
    try {
      const response = await this.assessments.updateModel(process, modelId);
      if (!response.is_success) {
        throw new Error(response.message || 'No se pudo actualizar el modelo.');
      }
      this.toast.success('Modelo actualizado', `${PROCESS_LABELS[process]} ahora usa ${modelId}.`);
    } catch (error) {
      this.processes.set(previous);
      this.toast.error(
        'No se pudo actualizar el modelo',
        error instanceof Error ? error.message : 'Error inesperado',
      );
    } finally {
      this.savingProcess.set(null);
    }
  }
}
