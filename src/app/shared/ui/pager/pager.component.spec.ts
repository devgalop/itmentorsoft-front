import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PagerComponent } from './pager.component';

describe('PagerComponent', () => {
  let fixture: ComponentFixture<PagerComponent>;

  function setup(page: number, totalPages: number): PagerComponent {
    TestBed.configureTestingModule({ imports: [PagerComponent] });
    fixture = TestBed.createComponent(PagerComponent);
    fixture.componentRef.setInput('page', page);
    fixture.componentRef.setInput('totalPages', totalPages);
    fixture.detectChanges();
    return fixture.componentInstance;
  }

  const el = () => fixture.nativeElement as HTMLElement;
  const buttons = () => el().querySelectorAll<HTMLButtonElement>('.pg__btn');

  it('is hidden when there is a single page or none', () => {
    setup(0, 1);
    expect(el().querySelector('.pg')).toBeNull();
    TestBed.resetTestingModule();
    setup(0, 0);
    expect(el().querySelector('.pg')).toBeNull();
  });

  it('shows the page number (1-based) and the total', () => {
    setup(1, 4);
    expect(el().querySelector('.pg__info')?.textContent).toContain('Página 2 de 4');
  });

  it('disables Anterior on the first page and Siguiente on the last one', () => {
    const c = setup(0, 3);
    expect(c.canPrev()).toBe(false);
    expect(buttons()[0]!.disabled).toBe(true);
    expect(buttons()[1]!.disabled).toBe(false);
    TestBed.resetTestingModule();
    const last = setup(2, 3);
    expect(last.canNext()).toBe(false);
    expect(buttons()[1]!.disabled).toBe(true);
  });

  it('emits prev and next when the buttons are clicked', () => {
    const c = setup(1, 3);
    const events: string[] = [];
    c.prev.subscribe(() => events.push('prev'));
    c.next.subscribe(() => events.push('next'));
    buttons()[0]!.click();
    buttons()[1]!.click();
    expect(events).toEqual(['prev', 'next']);
  });
});
