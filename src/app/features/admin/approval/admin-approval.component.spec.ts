import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { AdminApprovalComponent } from './admin-approval.component';
import { ApprovalService } from '../../../core/admin/approval.service';
import { AuthService } from '../../../core/auth/auth.service';

describe('AdminApprovalComponent', () => {
  let approvalMock: {
    getPending: ReturnType<typeof vi.fn>;
    reviewQuestion: ReturnType<typeof vi.fn>;
  };
  let authMock: { userId: ReturnType<typeof vi.fn> };

  function pending(id: string) {
    return {
      question_id: id,
      text_to_evaluate: '¿Qué es ' + id + '?',
      concept: 'POO',
      definition: 'def',
      simple_explanation: 'expl',
      correct_sample: 'ok',
      wrong_sample: 'no',
      common_misconceptions: [],
      rubric: [],
      semantic_keywords: [],
      status: 'draft',
      difficulty: 'basic',
      classification: 'novice',
      version: 1,
    };
  }

  function createComponent(): AdminApprovalComponent {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        AdminApprovalComponent,
        { provide: ApprovalService, useValue: approvalMock },
        { provide: AuthService, useValue: authMock },
      ],
    });
    return TestBed.inject(AdminApprovalComponent);
  }

  beforeEach(() => {
    approvalMock = {
      getPending: vi.fn().mockResolvedValue({ questions: [pending('q1'), pending('q2')], total: 2 }),
      reviewQuestion: vi.fn().mockResolvedValue({ is_success: true, message: 'ok' }),
    };
    authMock = { userId: vi.fn().mockReturnValue('admin-1') };
  });

  it('loads pending questions on creation', async () => {
    const c = createComponent();
    await Promise.resolve();
    await Promise.resolve();
    expect(approvalMock.getPending).toHaveBeenCalledWith(0, 50);
    expect(c.questions()).toHaveLength(2);
    expect(c.total()).toBe(2);
  });

  it('rejects review when comment is too short', async () => {
    const c = createComponent();
    await Promise.resolve();
    c.onCommentChange('q1', 'corto');
    await c.review(pending('q1'), 'published');
    expect(approvalMock.reviewQuestion).not.toHaveBeenCalled();
    expect(c.errorFor('q1')).toContain('al menos');
  });

  it('rejects review when there is no reviewer id', async () => {
    authMock.userId.mockReturnValue(null);
    const c = createComponent();
    await Promise.resolve();
    c.onCommentChange('q1', 'Comentario suficientemente largo.');
    await c.review(pending('q1'), 'published');
    expect(approvalMock.reviewQuestion).not.toHaveBeenCalled();
    expect(c.errorFor('q1')).toContain('revisor');
  });

  it('approves a question with reviewer_id and published status', async () => {
    const c = createComponent();
    await Promise.resolve();
    c.onCommentChange('q1', 'Se ve correcta y bien formulada.');
    await c.review(pending('q1'), 'published');

    expect(approvalMock.reviewQuestion).toHaveBeenCalledWith({
      question_id: 'q1',
      reviewer_id: 'admin-1',
      review_comments: 'Se ve correcta y bien formulada.',
      status: 'published',
    });
    expect(c.resolutionFor('q1')).toBe('published');
    expect(c.total()).toBe(1);
  });

  it('rejects (archives) a question', async () => {
    const c = createComponent();
    await Promise.resolve();
    c.onCommentChange('q2', 'No cumple con el nivel requerido.');
    await c.review(pending('q2'), 'archived');
    expect(approvalMock.reviewQuestion.mock.calls[0][0].status).toBe('archived');
    expect(c.resolutionFor('q2')).toBe('archived');
  });

  it('shows a row error when the service throws', async () => {
    approvalMock.reviewQuestion.mockRejectedValue(new Error('Error en el servidor'));
    const c = createComponent();
    await Promise.resolve();
    c.onCommentChange('q1', 'Comentario válido y suficiente.');
    await c.review(pending('q1'), 'published');
    expect(c.errorFor('q1')).toBe('Error en el servidor');
    expect(c.resolutionFor('q1')).toBeNull();
  });
});
