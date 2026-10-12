import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { GradingWatcherService, MAX_WAIT_MS } from './grading-watcher.service';
import { StudentAssessmentService } from './student-assessment.service';
import { ToastService } from '../../shared/ui/toast/toast.service';

describe('GradingWatcherService', () => {
  let statusMock: ReturnType<typeof vi.fn>;
  let toastMock: { show: ReturnType<typeof vi.fn>; warning: ReturnType<typeof vi.fn> };

  function create(): GradingWatcherService {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        { provide: StudentAssessmentService, useValue: { getQualificationStatus: statusMock } },
        { provide: ToastService, useValue: toastMock },
      ],
    });
    return TestBed.inject(GradingWatcherService);
  }

  beforeEach(() => {
    vi.useFakeTimers();
    localStorage.clear();
    statusMock = vi.fn().mockResolvedValue(false);
    toastMock = { show: vi.fn(), warning: vi.fn() };
  });

  afterEach(() => {
    vi.useRealTimers();
    localStorage.clear();
  });

  it('marks the evaluation as pending as soon as it starts watching', () => {
    const w = create();
    w.watch('u1', 'a1');
    expect(w.hasPending('u1')).toBe(true);
    expect(w.hasPending('other')).toBe(false);
    expect(w.hasPending(null)).toBe(false);
  });

  it('does not duplicate an evaluation that is already being watched', () => {
    const w = create();
    w.watch('u1', 'a1');
    w.watch('u1', 'a1');
    expect(w.pending()).toHaveLength(1);
  });

  it('keeps asking until the grade is ready, then warns and tells screens to refresh', async () => {
    statusMock.mockResolvedValueOnce(false).mockResolvedValueOnce(true);
    const w = create();
    w.watch('u1', 'a1');

    await vi.advanceTimersByTimeAsync(3000);
    expect(w.hasPending('u1')).toBe(true);
    expect(toastMock.show).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(4000);
    expect(statusMock).toHaveBeenCalledTimes(2);
    expect(statusMock).toHaveBeenCalledWith('u1', 'a1');
    expect(w.hasPending('u1')).toBe(false);
    expect(w.completedCount()).toBe(1);
    expect(toastMock.show).toHaveBeenCalledWith(
      'success',
      'Tu evaluación fue calificada',
      expect.any(String),
      expect.any(Number),
      { label: 'Ver resultado', route: ['/student/assessments'], queryParams: { result: 'a1' } },
    );
  });

  it('retries silently when a check fails', async () => {
    statusMock.mockRejectedValueOnce(new Error('boom')).mockResolvedValueOnce(true);
    const w = create();
    w.watch('u1', 'a1');
    await vi.advanceTimersByTimeAsync(3000 + 4000);
    expect(w.completedCount()).toBe(1);
    expect(toastMock.warning).not.toHaveBeenCalled();
  });

  it('lengthens the interval between checks up to a limit', async () => {
    const w = create();
    w.watch('u1', 'a1');
    await vi.advanceTimersByTimeAsync(3000);
    expect(statusMock).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(3999);
    expect(statusMock).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(1);
    expect(statusMock).toHaveBeenCalledTimes(2);
  });

  it('stops waiting after the maximum time and warns once', async () => {
    const w = create();
    w.watch('u1', 'a1');
    await vi.advanceTimersByTimeAsync(MAX_WAIT_MS + 20000);
    expect(w.hasPending('u1')).toBe(false);
    expect(toastMock.warning).toHaveBeenCalledTimes(1);
    expect(w.completedCount()).toBe(0);
  });

  it('resumes the pending evaluations of the same user after a reload', async () => {
    const first = create();
    first.watch('u1', 'a1');
    first.watch('u2', 'b1');

    statusMock.mockResolvedValue(true);
    const reloaded = create();
    reloaded.resume('u1');
    expect(reloaded.hasPending('u1')).toBe(true);
    expect(reloaded.hasPending('u2')).toBe(false);
    await vi.advanceTimersByTimeAsync(3000);
    expect(reloaded.completedCount()).toBe(1);
  });

  it('drops stored evaluations that are too old when resuming', () => {
    localStorage.setItem(
      'itm.grading-pending',
      JSON.stringify([{ assessmentId: 'old', userId: 'u1', startedAt: Date.now() - MAX_WAIT_MS - 1 }]),
    );
    const w = create();
    w.resume('u1');
    expect(w.hasPending('u1')).toBe(false);
  });

  it('ignores corrupted stored data', () => {
    localStorage.setItem('itm.grading-pending', '{no es json');
    const w = create();
    expect(() => w.resume('u1')).not.toThrow();
    localStorage.setItem('itm.grading-pending', JSON.stringify([{ foo: 1 }, null]));
    expect(() => w.resume('u1')).not.toThrow();
    expect(w.hasPending('u1')).toBe(false);
  });
});
