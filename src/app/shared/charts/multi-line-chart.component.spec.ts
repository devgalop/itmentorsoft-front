import { ComponentFixture, TestBed } from '@angular/core/testing';
import { LineSeries, MultiLineChartComponent } from './multi-line-chart.component';

describe('MultiLineChartComponent', () => {
  let fixture: ComponentFixture<MultiLineChartComponent>;

  const series: LineSeries[] = [
    { key: 'a', label: 'Tema A', color: '#3B6FD4', points: [{ x: 0, value: 20 }, { x: 1, value: 60 }, { x: 2, value: 100 }] },
    { key: 'b', label: 'Tema B', color: '#1ABCB0', points: [{ x: 2, value: 40 }, { x: 0, value: 0 }] },
  ];

  function setup(data: LineSeries[]): MultiLineChartComponent {
    TestBed.configureTestingModule({ imports: [MultiLineChartComponent] });
    fixture = TestBed.createComponent(MultiLineChartComponent);
    fixture.componentRef.setInput('series', data);
    fixture.detectChanges();
    return fixture.componentInstance;
  }

  const el = () => fixture.nativeElement as HTMLElement;

  it('collects the distinct x positions of every series in order', () => {
    const c = setup(series);
    expect(c.xs()).toEqual([0, 1, 2]);
    expect(c.ticks().map((t) => t.label)).toEqual(['1', '2', '3']);
  });

  it('spreads the x positions from the left edge to the right edge', () => {
    const c = setup(series);
    const px = c.ticks().map((t) => t.px);
    expect(px[0]).toBe(c.left);
    expect(px[2]).toBe(c.right);
  });

  it('sorts the points of each series by x before joining them', () => {
    const c = setup(series);
    const b = c.lines().find((l) => l.key === 'b')!;
    expect(b.coords.map((p) => p.x)).toEqual([0, 2]);
    expect(b.path.split(' ')).toHaveLength(2);
  });

  it('puts the best score (100) above the lowest one (0)', () => {
    const c = setup(series);
    const a = c.lines().find((l) => l.key === 'a')!;
    expect(a.coords[2]!.py).toBeLessThan(a.coords[0]!.py);
  });

  it('draws one line and one dot per point, with the series color', () => {
    setup(series);
    expect(el().querySelectorAll('polyline')).toHaveLength(2);
    expect(el().querySelectorAll('circle')).toHaveLength(5);
    expect(el().querySelector('polyline')?.getAttribute('stroke')).toBe('#3B6FD4');
  });

  it('does not draw a line for a series with a single point but still draws its dot', () => {
    setup([{ key: 'a', label: 'Tema A', color: '#3B6FD4', points: [{ x: 0, value: 50 }] }]);
    expect(el().querySelector('polyline')).toBeNull();
    expect(el().querySelectorAll('circle')).toHaveLength(1);
  });

  it('centers everything when there is a single position in time', () => {
    const c = setup([{ key: 'a', label: 'Tema A', color: '#3B6FD4', points: [{ x: 3, value: 50 }] }]);
    expect(c.ticks()).toHaveLength(1);
    expect(c.ticks()[0]!.px).toBeCloseTo((c.left + c.right) / 2, 1);
    expect(c.ticks()[0]!.label).toBe('4');
  });

  it('lists every series in the legend', () => {
    setup(series);
    const items = Array.from(el().querySelectorAll('.ml__item')).map((i) => i.textContent!.trim());
    expect(items).toEqual(['Tema A', 'Tema B']);
  });

  it('always shows the data table, without having to open anything', () => {
    setup(series);
    expect(el().querySelector('details')).toBeNull();
    expect(el().querySelector('.ml__table-title')?.textContent).toBe('Datos por evaluación');
    expect(el().querySelectorAll('.ml__table tbody tr')).toHaveLength(2);
  });

  it('offers the data as a table with a dash where a series has no measurement', () => {
    setup(series);
    const rows = el().querySelectorAll('.ml__table tbody tr');
    expect(rows).toHaveLength(2);
    expect(rows[0]!.textContent).toContain('100%');
    const cells = Array.from(rows[1]!.querySelectorAll('td')).map((c) => c.textContent!.replace(/\s+/g, ' ').trim());
    expect(cells.slice(0, 4)).toEqual(['Tema B', '0%', '—', '40%']);
  });

  it('titles each column with the measurement number and adds a change column', () => {
    setup(series);
    const heads = Array.from(el().querySelectorAll('.ml__table thead th')).map((h) => h.textContent!.trim());
    expect(heads).toEqual(['Tema', 'Evaluación 1', 'Evaluación 2', 'Evaluación 3', 'Cambio']);
  });

  it('computes the change between the first and the last measurement of each series', () => {
    const c = setup(series);
    expect(c.rows().map((r) => r.change)).toEqual([80, 40]);
  });

  it('shows the change as an up arrow, a down arrow or no change, and a dash with a single point', () => {
    const c = setup([
      { key: 'up', label: 'Sube', color: '#111111', points: [{ x: 0, value: 10 }, { x: 1, value: 40 }] },
      { key: 'down', label: 'Baja', color: '#222222', points: [{ x: 0, value: 60 }, { x: 1, value: 30 }] },
      { key: 'flat', label: 'Igual', color: '#333333', points: [{ x: 0, value: 50 }, { x: 1, value: 50 }] },
      { key: 'one', label: 'Una sola', color: '#444444', points: [{ x: 0, value: 50 }] },
    ]);
    expect(c.rows().map((r) => r.change)).toEqual([30, -30, 0, null]);
    const changes = Array.from(el().querySelectorAll('.ml__table tbody tr')).map((r) =>
      r.querySelector('td:last-child')!.textContent!.trim(),
    );
    expect(changes[0]).toBe('▲ +30 pts');
    expect(changes[1]).toBe('▼ -30 pts');
    expect(changes[2]).toBe('= sin cambio');
    expect(changes[3]).toBe('—');
  });

  it('describes the chart for assistive technology and gives each dot a tooltip', () => {
    setup(series);
    expect(el().querySelector('svg')?.getAttribute('aria-label')).toBe(
      'Tema A: 20%, 60%, 100%. Tema B: 0%, 40%',
    );
    expect(el().querySelector('circle title')?.textContent).toContain('Tema A · Evaluación 1: 20%');
  });
});
