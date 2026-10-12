import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ColumnChartComponent } from './column-chart.component';
import { ChartItem } from './chart-item';

describe('ColumnChartComponent', () => {
  let fixture: ComponentFixture<ColumnChartComponent>;

  const items: ChartItem[] = [
    { key: 'a', label: 'Principiante', count: 0, color: '#9BE3DD' },
    { key: 'b', label: 'Básico', count: 2, color: '#4FCFC6' },
    { key: 'c', label: 'Avanzado', count: 4, color: '#0E7F78' },
  ];

  function setup(data: ChartItem[], caption = ''): ColumnChartComponent {
    TestBed.configureTestingModule({ imports: [ColumnChartComponent] });
    fixture = TestBed.createComponent(ColumnChartComponent);
    fixture.componentRef.setInput('items', data);
    fixture.componentRef.setInput('caption', caption);
    fixture.detectChanges();
    return fixture.componentInstance;
  }

  const el = () => fixture.nativeElement as HTMLElement;

  it('computes the total, the maximum and the percentages', () => {
    const c = setup(items);
    expect(c.total()).toBe(6);
    expect(c.max()).toBe(4);
    expect(c.percent(2)).toBe(33);
  });

  it('draws one column per item in the order received', () => {
    setup(items);
    const labels = Array.from(el().querySelectorAll('.cc__label')).map((e) => e.textContent);
    expect(labels).toEqual(['Principiante', 'Básico', 'Avanzado']);
  });

  it('scales the columns to the tallest one and leaves empty categories at height 0', () => {
    const c = setup(items);
    expect(c.barPx(4)).toBe(120);
    expect(c.barPx(2)).toBe(60);
    expect(c.barPx(0)).toBe(0);
  });

  it('shows the count above each column', () => {
    setup(items);
    const values = Array.from(el().querySelectorAll('.cc__value')).map((e) => e.textContent);
    expect(values).toEqual(['0', '2', '4']);
  });

  it('shows the total with its caption', () => {
    setup(items, 'estudiantes clasificados');
    expect(el().querySelector('.cc__total-num')?.textContent).toBe('6');
    expect(el().querySelector('.cc__caption')?.textContent).toBe('estudiantes clasificados');
  });

  it('describes the chart for assistive technology and gives each column a tooltip', () => {
    setup(items);
    expect(el().querySelector('.cc__plot')?.getAttribute('aria-label')).toBe(
      'Principiante: 0, Básico: 2, Avanzado: 4',
    );
    expect(el().querySelectorAll('.cc__col')[1]?.getAttribute('title')).toBe('Básico: 2 (33%)');
  });

  it('does not divide by zero when everything is 0', () => {
    const c = setup([{ key: 'a', label: 'Uno', count: 0, color: '#111111' }]);
    expect(c.max()).toBe(0);
    expect(c.barPx(0)).toBe(0);
    expect(c.percent(0)).toBe(0);
  });
});
