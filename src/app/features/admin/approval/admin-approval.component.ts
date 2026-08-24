import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AuthService } from '@core/auth/auth.service';
import { ApprovalService } from '@core/admin/approval.service';
import { PendingQuestion, ReviewStatus } from '@core/admin/approval.types';
import { ToastService } from '@shared/ui/toast/toast.service';

const MIN_COMMENT = 10;

@Component({
  selector: 'app-admin-approval',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './admin-approval.component.html',
  styleUrl: './admin-approval.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminApprovalComponent {
  private readonly approval = inject(ApprovalService);
  private readonly auth = inject(AuthService);
  private readonly toast = inject(ToastService);

  readonly questions = signal<PendingQuestion[]>([]);
  readonly total = signal(0);
  readonly isLoading = signal(true);
  readonly loadError = signal<string | null>(null);

  // Estado por pregunta (comentario + guardando + resuelta)
  readonly comments = signal<Record<string, string>>({});
  readonly savingId = signal<string | null>(null);
  readonly rowError = signal<Record<string, string>>({});
  readonly resolved = signal<Record<string, ReviewStatus>>({});

  readonly minComment = MIN_COMMENT;

  constructor() {
    void this.load();
  }

  async load(): Promise<void> {
    this.isLoading.set(true);
    this.loadError.set(null);
    try {
      const result = await this.approval.getPending(0, 50);
      this.questions.set(result.questions);
      this.total.set(result.total);
    } catch (error) {
      this.questions.set([]);
      this.total.set(0);
      this.loadError.set(error instanceof Error ? error.message : 'Error al cargar pendientes');
    } finally {
      this.isLoading.set(false);
    }
  }

  commentFor(id: string): string {
    return this.comments()[id] ?? '';
  }

  onCommentChange(id: string, value: string): void {
    this.comments.update((c) => ({ ...c, [id]: value }));
  }

  errorFor(id: string): string | null {
    return this.rowError()[id] ?? null;
  }

  resolutionFor(id: string): ReviewStatus | null {
    return this.resolved()[id] ?? null;
  }

  async review(question: PendingQuestion, status: ReviewStatus): Promise<void> {
    const reviewerId = this.auth.userId();
    if (!reviewerId) {
      this.setRowError(question.question_id, 'No se pudo identificar al revisor. Iniciá sesión de nuevo.');
      return;
    }

    const comment = this.commentFor(question.question_id).trim();
    if (comment.length < MIN_COMMENT) {
      this.setRowError(
        question.question_id,
        `El comentario debe tener al menos ${MIN_COMMENT} caracteres.`,
      );
      return;
    }

    this.setRowError(question.question_id, null);
    this.savingId.set(question.question_id);

    try {
      const response = await this.approval.reviewQuestion({
        question_id: question.question_id,
        reviewer_id: reviewerId,
        review_comments: comment,
        status,
      });
      if (response.is_success) {
        this.resolved.update((r) => ({ ...r, [question.question_id]: status }));
        this.total.update((t) => Math.max(0, t - 1));
        this.toast.success(
          status === 'published' ? 'Pregunta aprobada' : 'Pregunta rechazada',
          status === 'published' ? 'La pregunta fue publicada.' : 'La pregunta fue archivada.',
        );
      } else {
        this.setRowError(question.question_id, response.message || 'No se pudo guardar la revisión');
      }
    } catch (error) {
      this.setRowError(
        question.question_id,
        error instanceof Error ? error.message : 'Error al revisar la pregunta',
      );
    } finally {
      this.savingId.set(null);
    }
  }

  private setRowError(id: string, message: string | null): void {
    this.rowError.update((e) => {
      const next = { ...e };
      if (message) next[id] = message;
      else delete next[id];
      return next;
    });
  }
}
