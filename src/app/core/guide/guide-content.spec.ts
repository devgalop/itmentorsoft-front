import { GUIDE_STEPS } from './guide-content';
import { STUDENT_NAV_ITEMS } from '../../features/student/layout/student-nav-items';
import { TEACHER_NAV_ITEMS } from '../../features/teacher/layout/teacher-nav-items';

const MENU_ROUTES = {
  student: STUDENT_NAV_ITEMS.map((i) => i.route),
  teacher: TEACHER_NAV_ITEMS.map((i) => i.route),
};

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

      it('points every target at an option that exists in the menu of that role', () => {
        for (const step of GUIDE_STEPS[role]) {
          if (step.target) expect(MENU_ROUTES[role]).toContain(step.target);
        }
      });

      it('has at least one step that highlights a menu option, and the welcome step does not', () => {
        expect(GUIDE_STEPS[role].some((s) => s.target)).toBe(true);
        expect(GUIDE_STEPS[role][0]!.target).toBeUndefined();
      });

      it('does not repeat titles', () => {
        const titles = GUIDE_STEPS[role].map((s) => s.title);
        expect(new Set(titles).size).toBe(titles.length);
      });
    });
  }
});
