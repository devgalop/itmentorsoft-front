import { levelMedal } from './level-medal';

describe('levelMedal', () => {
  it('maps each level to its rank and name', () => {
    expect(['Principiante', 'básico', 'INTERMEDIO', 'Avanzado'].map((l) => levelMedal(l)?.rank)).toEqual([0, 1, 2, 3]);
    expect(levelMedal('básico')?.name).toBe('Básico');
  });

  it('ignores accents', () => {
    expect(levelMedal('basico')?.rank).toBe(1);
  });

  it('returns null when it is not one of the four levels', () => {
    expect(levelMedal(null)).toBeNull();
    expect(levelMedal('')).toBeNull();
    expect(levelMedal('average')).toBeNull();
    expect(levelMedal('Student classification will be determined')).toBeNull();
  });
});
