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

  it('auto-dismisses error toasts too, after a longer time than the others', () => {
    service.error('Falló');
    vi.advanceTimersByTime(4000);
    expect(service.toasts()).toHaveLength(1);
    vi.advanceTimersByTime(3000);
    expect(service.toasts()).toHaveLength(0);
  });

  it('keeps a toast until it is closed by hand when its duration is 0', () => {
    service.error('Falló', 'Detalle', 0);
    vi.advanceTimersByTime(60000);
    expect(service.toasts()).toHaveLength(1);
  });

  it('replaces an identical toast instead of stacking it, and restarts its time', () => {
    service.error('Código incorrecto', 'Revisa el código');
    vi.advanceTimersByTime(5000);
    service.error('Código incorrecto', 'Revisa el código');
    expect(service.toasts()).toHaveLength(1);

    // El primero ya habría vencido a los 7 s; el segundo empezó hace 3 s y sigue a la vista.
    vi.advanceTimersByTime(3000);
    expect(service.toasts()).toHaveLength(1);
    vi.advanceTimersByTime(4000);
    expect(service.toasts()).toHaveLength(0);
  });

  it('keeps toasts that only look alike: different title or message', () => {
    service.error('Código incorrecto', 'A');
    service.error('Código incorrecto', 'B');
    service.error('Otro', 'A');
    expect(service.toasts()).toHaveLength(3);
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

  it('keeps the action link of a toast', () => {
    service.show('success', 'Listo', 'ok', 0, { label: 'Ver', route: ['/a'], queryParams: { x: '1' } });
    expect(service.toasts()[0]!.action).toEqual({ label: 'Ver', route: ['/a'], queryParams: { x: '1' } });
  });
});
