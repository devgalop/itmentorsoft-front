import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { GUIDE_STEPS } from './guide-content';
import { GuideService } from './guide.service';

describe('GuideService', () => {
  let service: GuideService;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({});
    service = TestBed.inject(GuideService);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
  });

  it('starts closed and without steps', () => {
    expect(service.isOpen()).toBe(false);
    expect(service.steps()).toEqual([]);
  });

  it('opens by itself the first time, with the steps of the role', () => {
    service.startIfFirstTime('student', 's1');
    expect(service.isOpen()).toBe(true);
    expect(service.steps()).toEqual(GUIDE_STEPS.student);

    service.close();
    service.startIfFirstTime('teacher', 't1');
    expect(service.steps()).toEqual(GUIDE_STEPS.teacher);
  });

  it('remembers that it was seen when it is closed, and does not open by itself again', () => {
    service.startIfFirstTime('student', 's1');
    service.close();

    expect(service.isOpen()).toBe(false);
    expect(service.hasSeen('student', 's1')).toBe(true);

    service.startIfFirstTime('student', 's1');
    expect(service.isOpen()).toBe(false);
  });

  it('remembers it per user and per role', () => {
    service.startIfFirstTime('student', 's1');
    service.close();

    expect(service.hasSeen('student', 's2')).toBe(false);
    expect(service.hasSeen('teacher', 's1')).toBe(false);
    service.startIfFirstTime('student', 's2');
    expect(service.isOpen()).toBe(true);
  });

  it('can be opened by hand even if it was already seen', () => {
    service.startIfFirstTime('student', 's1');
    service.close();

    service.open('student', 's1');
    expect(service.isOpen()).toBe(true);
    expect(service.steps().length).toBeGreaterThan(0);
  });

  it('does not open by itself without a user id', () => {
    service.startIfFirstTime('student', '');
    expect(service.isOpen()).toBe(false);
  });

  it('closing when it is not open does not remember anything', () => {
    service.close();
    expect(localStorage.length).toBe(0);
  });

  it('works without storage: opens, and is shown again next time', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('bloqueado');
    });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('bloqueado');
    });

    service.startIfFirstTime('student', 's1');
    expect(service.isOpen()).toBe(true);

    expect(() => service.close()).not.toThrow();
    expect(service.isOpen()).toBe(false);
    expect(service.hasSeen('student', 's1')).toBe(false);
  });
});
