import { CATEGORY_PALETTE, FALLBACK_COLOR } from './chart-colors';
import { toCategoryItems } from './chart-utils';

const row = (n: number, count = 1) => ({ key: 'k' + n, label: 'Cat ' + n, count });

describe('toCategoryItems', () => {
  it('assigns the palette by position when there are few categories', () => {
    const items = toCategoryItems([row(1), row(2), row(3)]);
    expect(items.map((i) => i.color)).toEqual(CATEGORY_PALETTE.slice(0, 3));
  });

  it('keeps all the categories when they match the number of colors', () => {
    const items = toCategoryItems([1, 2, 3, 4, 5, 6].map((n) => row(n)));
    expect(items).toHaveLength(6);
    expect(items.every((i) => i.color !== FALLBACK_COLOR)).toBe(true);
  });

  it('groups the tail into "Otros" when there are more categories than colors', () => {
    const items = toCategoryItems([1, 2, 3, 4, 5, 6, 7, 8].map((n) => row(n, n)));
    expect(items).toHaveLength(6);
    const last = items[5]!;
    expect(last.label).toBe('Otros (3)');
    expect(last.count).toBe(6 + 7 + 8);
    expect(last.color).toBe(FALLBACK_COLOR);
    expect(items.slice(0, 5).map((i) => i.label)).toEqual(['Cat 1', 'Cat 2', 'Cat 3', 'Cat 4', 'Cat 5']);
  });

  it('returns an empty list for no categories', () => {
    expect(toCategoryItems([])).toEqual([]);
  });
});
