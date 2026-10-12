import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ScoreBarsComponent, ScoreItem } from './score-bars.component';

describe('ScoreBarsComponent', () => {
  let fixture: ComponentFixture<ScoreBarsComponent>;

  const items: ScoreItem[] = [
    { key: 'a', label: 'Tema A', value: 40 },
    { key: 'b', label: 'Tema B', value: 85.4 },
    { key: 'c', label: 'Tema C', value: 10 },
  ];

  function setup(data: ScoreItem[]): ScoreBarsComponent {
    TestBed.configureTestingModule({ imports: [ScoreBarsComponent] });
    fixture = TestBed.createComponent(ScoreBarsComponent);
    fixture.componentRef.setInput('items', data);
    fixture.detectChanges();
    return fixture.componentInstance;
  }

  const el = () => fixture.nativeElement as HTMLElement;

  it('orders the topics from the best score to the worst', () => {
    const c = setup(items);
    expect(c.sorted().map((i) => i.key)).toEqual(['b', 'a', 'c']);
    const labels = Array.from(el().querySelectorAll('.sbr__label')).map((e) => e.textContent);
    expect(labels).toEqual(['Tema B', 'Tema A', 'Tema C']);
  });

  it('keeps the received order when two topics have the same score', () => {
    const c = setup([
      { key: 'x', label: 'X', value: 50 },
      { key: 'y', label: 'Y', value: 50 },
    ]);
    expect(c.sorted().map((i) => i.key)).toEqual(['x', 'y']);
  });

  it('shows the whole-number percentage and sizes the bar to the 0–100 scale', () => {
    setup(items);
    const first = el().querySelector('.sbr__row')!;
    expect(first.querySelector('.sbr__value')?.textContent).toBe('85%');
    expect((first.querySelector('.sbr__bar') as HTMLElement).style.width).toBe('85%');
  });

  it('clamps the percentage between 0 and 100', () => {
    const c = setup(items);
    expect(c.pct(140)).toBe(100);
    expect(c.pct(-5)).toBe(0);
  });

  it('marks the strongest topic and the one to reinforce', () => {
    const c = setup(items);
    expect(c.bestKey()).toBe('b');
    expect(c.worstKey()).toBe('c');
    expect(el().querySelector('.sbr__tag--best')?.textContent).toContain('Mayor fortaleza');
    expect(el().querySelector('.sbr__tag--worst')?.textContent).toContain('A reforzar');
  });

  it('does not mark anything when there is a single topic or every score is the same', () => {
    const one = setup([{ key: 'a', label: 'A', value: 70 }]);
    expect(one.bestKey()).toBeNull();
    expect(el().querySelector('.sbr__tag')).toBeNull();
    TestBed.resetTestingModule();
    const tie = setup([
      { key: 'a', label: 'A', value: 70 },
      { key: 'b', label: 'B', value: 70 },
    ]);
    expect(tie.worstKey()).toBeNull();
  });

  it('without its own color, a higher score gets a darker color from the ramp', () => {
    const c = setup(items);
    expect(c.fill({ key: 'a', label: 'A', value: 85 })).not.toBe(c.fill({ key: 'b', label: 'B', value: 10 }));
  });

  it('with its own color, the bar goes from a light tint at 0% to the original color at 100%', () => {
    const c = setup(items);
    const at = (value: number) => c.fill({ key: 'a', label: 'A', value, color: '#3B6FD4' });
    expect(at(100)).toBe('color-mix(in srgb, #3B6FD4 100%, #ffffff)');
    expect(at(0)).toBe('color-mix(in srgb, #3B6FD4 22%, #ffffff)');
    expect(at(50)).toBe('color-mix(in srgb, #3B6FD4 61%, #ffffff)');
  });

  it('paints the bar as a gradient from the light tint to the score color', () => {
    const c = setup(items);
    expect(c.gradient({ key: 'a', label: 'A', value: 100, color: '#3B6FD4' })).toBe(
      'linear-gradient(90deg, color-mix(in srgb, #3B6FD4 22%, #ffffff), color-mix(in srgb, #3B6FD4 100%, #ffffff))',
    );
    expect(c.gradient({ key: 'a', label: 'A', value: 50 })).toBe(c.fill({ key: 'a', label: 'A', value: 50 }));
  });

  it('clamps the tint when the score is out of range', () => {
    const c = setup(items);
    expect(c.fill({ key: 'a', label: 'A', value: 250, color: '#3B6FD4' })).toContain('#3B6FD4 100%');
    expect(c.fill({ key: 'a', label: 'A', value: -10, color: '#3B6FD4' })).toContain('#3B6FD4 22%');
  });

  it('shows a dot with the topic color only when the item has one', () => {
    setup([
      { key: 'a', label: 'A', value: 60, color: '#3B6FD4' },
      { key: 'b', label: 'B', value: 30 },
    ]);
    expect(el().querySelectorAll('.sbr__dot')).toHaveLength(1);
  });

  it('describes each bar for assistive technology', () => {
    setup(items);
    expect(el().querySelector('.sbr__track')?.getAttribute('aria-label')).toBe('Tema B: 85%');
  });
});
