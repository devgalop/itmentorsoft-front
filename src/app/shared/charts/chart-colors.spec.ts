import { FALLBACK_COLOR, levelColor, roleColor } from './chart-colors';

describe('chart colors', () => {
  it('gives each role its own color', () => {
    const colors = ['admin', 'teacher', 'student', 'user'].map(roleColor);
    expect(new Set(colors).size).toBe(4);
  });

  it('is case-insensitive and falls back to gray for unknown values', () => {
    expect(roleColor('ADMIN')).toBe(roleColor('admin'));
    expect(roleColor('auditor')).toBe(FALLBACK_COLOR);
    expect(levelColor('desconocido')).toBe(FALLBACK_COLOR);
  });

  it('keeps the level ramp in order from light to dark', () => {
    const ramp = ['principiante', 'básico', 'intermedio', 'avanzado'].map(levelColor);
    const lightness = (hex: string) => {
      const n = parseInt(hex.slice(1), 16);
      return (0.2126 * (n >> 16) + 0.7152 * ((n >> 8) & 255) + 0.0722 * (n & 255)) / 255;
    };
    const values = ramp.map(lightness);
    expect([...values].sort((a, b) => b - a)).toEqual(values);
  });
});
