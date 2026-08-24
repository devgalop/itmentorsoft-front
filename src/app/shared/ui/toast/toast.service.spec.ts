import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { ToastService } from './toast.service';

describe('ToastService', () => {
  let service: ToastService;

  beforeEach(() => {
    vi.useFakeTimers();
    TestBed.configureTestingModule({ providers: [ToastService] });
    service = TestBed.inject(ToastService);
  });

  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
  });

  it('adds a success toast', () => {
    service.success('Guardado', 'Todo bien');
    const list = service.toasts();
    expect(list).toHaveLength(1);
    expect(list[0].type).toBe('success');
    expect(list[0].title).toBe('Guardado');
  });

  it('auto-dismisses non-error toasts after the duration', () => {
    service.success('Guardado');
    expect(service.toasts()).toHaveLength(1);
    vi.advanceTimersByTime(4000);
    expect(service.toasts()).toHaveLength(0);
  });

  it('does not auto-dismiss error toasts by default', () => {
    service.error('Falló');
    vi.advanceTimersByTime(10000);
    expect(service.toasts()).toHaveLength(1);
  });

  it('dismisses a toast by id', () => {
    const id = service.info('Info');
    service.dismiss(id);
    expect(service.toasts()).toHaveLength(0);
  });

  it('stacks multiple toasts', () => {
    service.success('A');
    service.error('B');
    service.info('C');
    expect(service.toasts()).toHaveLength(3);
  });

  it('clears all toasts', () => {
    service.success('A');
    service.error('B');
    service.clear();
    expect(service.toasts()).toHaveLength(0);
  });

  it('respects a custom duration', () => {
    service.show('info', 'X', undefined, 1000);
    vi.advanceTimersByTime(999);
    expect(service.toasts()).toHaveLength(1);
    vi.advanceTimersByTime(1);
    expect(service.toasts()).toHaveLength(0);
  });
});
