import { GUIDE_STEPS } from './guide-content';

/** Iconos que sabe dibujar `app-sidebar-icon`. */
const KNOWN_ICONS = ['home', 'users', 'shield', 'check', 'settings', 'chart', 'book', 'folder', 'route', 'search', 'logout'];

describe('GUIDE_STEPS', () => {
  it('has a guide for students and for teachers, and none for admins', () => {
    expect(Object.keys(GUIDE_STEPS).sort()).toEqual(['student', 'teacher']);
  });

  for (const role of ['student', 'teacher'] as const) {
    describe(role, () => {
      it('has between 4 and 8 steps, so it stays short', () => {
        expect(GUIDE_STEPS[role].length).toBeGreaterThanOrEqual(4);
        expect(GUIDE_STEPS[role].length).toBeLessThanOrEqual(8);
      });

      it('gives every step a title, a text and a known icon', () => {
        for (const step of GUIDE_STEPS[role]) {
          expect(step.title.trim()).not.toBe('');
          expect(step.text.trim()).not.toBe('');
          expect(KNOWN_ICONS).toContain(step.icon);
        }
      });

      it('does not repeat titles', () => {
        const titles = GUIDE_STEPS[role].map((s) => s.title);
        expect(new Set(titles).size).toBe(titles.length);
      });
    });
  }
});
