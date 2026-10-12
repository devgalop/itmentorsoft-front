import { buildSparkline } from './sparkline';

describe('buildSparkline', () => {
  it('needs at least two values', () => {
    expect(buildSparkline([], 100, 30)).toBeNull();
    expect(buildSparkline([50], 100, 30)).toBeNull();
  });

  it('spreads the points across the width, with 100 at the top and 0 at the bottom', () => {
    const s = buildSparkline([0, 100], 100, 30, 4)!;
    expect(s.points).toBe('4.0,26.0 96.0,4.0');
    expect(s.last).toEqual({ x: 96, y: 4 });
  });

  it('clamps values outside the range', () => {
    const s = buildSparkline([-20, 250], 100, 30, 4)!;
    expect(s.points).toBe('4.0,26.0 96.0,4.0');
  });
});
