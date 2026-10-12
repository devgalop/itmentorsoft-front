import { ComponentFixture, TestBed } from '@angular/core/testing';
import { StatCardsComponent } from './stat-cards.component';
import { ChartItem } from './chart-item';

describe('StatCardsComponent', () => {
  let fixture: ComponentFixture<StatCardsComponent>;

  const items: ChartItem[] = [
    { key: 'a', label: 'Uno', count: 3, color: '#111111' },
    { key: 'b', label: 'Dos', count: 1, color: '#222222' },
    { key: 'c', label: 'Tres', count: 0, color: '#333333' },
  ];

  function setup(data: ChartItem[], caption = ''): StatCardsComponent {
    TestBed.configureTestingModule({ imports: [StatCardsComponent] });
    fixture = TestBed.createComponent(StatCardsComponent);
    fixture.componentRef.setInput('items', data);
    fixture.componentRef.setInput('caption', caption);
    fixture.detectChanges();
    return fixture.componentInstance;
  }

  const el = () => fixture.nativeElement as HTMLElement;

  it('adds up the total and computes whole-number percentages', () => {
    const c = setup(items);
    expect(c.total()).toBe(4);
    expect(c.percent(3)).toBe(75);
    expect(c.percent(1)).toBe(25);
    expect(c.percent(0)).toBe(0);
  });

  it('renders one card per item with its number and percentage', () => {
    setup(items);
    const cards = el().querySelectorAll('.sc__card');
    expect(cards).toHaveLength(3);
    expect(cards[0]!.textContent).toContain('Uno');
    expect(cards[0]!.querySelector('.sc__value')?.textContent).toBe('3');
    expect(cards[0]!.querySelector('.sc__pct')?.textContent).toBe('75%');
    expect(cards[2]!.querySelector('.sc__pct')?.textContent).toBe('0%');
  });

  it('shows the total with its caption', () => {
    setup(items, 'usuarios en total');
    expect(el().querySelector('.sc__total-num')?.textContent).toBe('4');
    expect(el().querySelector('.sc__caption')?.textContent).toBe('usuarios en total');
  });

  it('shows 0% for everything when the total is 0', () => {
    const c = setup([{ key: 'a', label: 'Uno', count: 0, color: '#111111' }]);
    expect(c.total()).toBe(0);
    expect(c.percent(0)).toBe(0);
  });
});
