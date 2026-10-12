import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PieChartComponent } from './pie-chart.component';
import { ChartItem } from './chart-item';

describe('PieChartComponent', () => {
  let fixture: ComponentFixture<PieChartComponent>;

  const items: ChartItem[] = [
    { key: 'a', label: 'Uno', count: 3, color: '#111111' },
    { key: 'b', label: 'Dos', count: 1, color: '#222222' },
    { key: 'c', label: 'Tres', count: 0, color: '#333333' },
  ];

  function setup(data: ChartItem[], caption = ''): PieChartComponent {
    TestBed.configureTestingModule({ imports: [PieChartComponent] });
    fixture = TestBed.createComponent(PieChartComponent);
    fixture.componentRef.setInput('items', data);
    fixture.componentRef.setInput('caption', caption);
    fixture.detectChanges();
    return fixture.componentInstance;
  }

  const el = () => fixture.nativeElement as HTMLElement;

  it('adds up the total and computes the percentages', () => {
    const c = setup(items);
    expect(c.total()).toBe(4);
    expect(c.percent(3)).toBe(75);
    expect(c.percent(0)).toBe(0);
  });

  it('draws only the slices that have a value, with their percentage', () => {
    const c = setup(items);
    expect(c.slices().map((s) => [s.label, s.pct])).toEqual([['Uno', 75], ['Dos', 25]]);
    expect(el().querySelectorAll('.pc__slice')).toHaveLength(2);
  });

  it('draws a slice as an arc path and uses the large-arc flag past half of the circle', () => {
    const c = setup(items);
    const [big, small] = c.slices();
    expect(big!.path).toMatch(/^M 50 50 L .* A 48 48 0 1 1 .* Z$/);
    expect(small!.path).toMatch(/A 48 48 0 0 1 /);
  });

  it('draws a full circle when a single category has everything', () => {
    const c = setup([{ key: 'a', label: 'Uno', count: 5, color: '#111111' }]);
    expect(c.slices()[0]!.path).toBeNull();
    expect(el().querySelector('circle.pc__slice')).not.toBeNull();
    expect(el().querySelector('path.pc__slice')).toBeNull();
  });

  it('lists every item in the legend, including the ones with 0', () => {
    setup(items);
    const rows = el().querySelectorAll('.pc__row');
    expect(rows).toHaveLength(3);
    expect(rows[2]!.textContent).toContain('Tres');
    expect(rows[2]!.textContent).toContain('0%');
  });

  it('shows the total with its caption and describes the chart for assistive technology', () => {
    setup(items, 'recursos activos');
    expect(el().querySelector('.pc__total-num')?.textContent).toBe('4');
    expect(el().querySelector('.pc__caption')?.textContent).toBe('recursos activos');
    expect(el().querySelector('svg')?.getAttribute('aria-label')).toBe('Uno: 3, Dos: 1, Tres: 0');
  });

  it('shows an empty message and no drawing when everything is 0', () => {
    const c = setup([{ key: 'a', label: 'Uno', count: 0, color: '#111111' }]);
    expect(c.slices()).toEqual([]);
    expect(el().querySelector('svg')).toBeNull();
    expect(el().querySelector('.pc__empty')?.textContent).toContain('Sin datos');
  });
});
