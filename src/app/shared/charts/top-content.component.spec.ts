import { ComponentFixture, TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { TopContentComponent } from './top-content.component';
import { AssessmentsService } from '../../core/assessments/assessments.service';
import { ContentService } from '../../core/content/content.service';

async function flush(times = 10): Promise<void> {
  for (let i = 0; i < times; i++) {
    await Promise.resolve();
  }
}

describe('TopContentComponent', () => {
  let fixture: ComponentFixture<TopContentComponent>;
  let assessmentsMock: { getTopics: ReturnType<typeof vi.fn> };
  let contentMock: {
    getTopBestContent: ReturnType<typeof vi.fn>;
    getTopWorseContent: ReturnType<typeof vi.fn>;
  };

  const best = [{ content_id: 'c1', title: 'Capas', summary: '', rating: 4.8 }];
  const worse = [{ content_id: 'c2', title: 'Intro', summary: '', rating: 1.2 }];

  function setup(opts?: { topics?: string[]; topBestReject?: Error; topicsReject?: Error }): TopContentComponent {
    assessmentsMock = {
      getTopics: opts?.topicsReject
        ? vi.fn().mockRejectedValue(opts.topicsReject)
        : vi.fn().mockResolvedValue(opts?.topics ?? ['APIs', 'POO']),
    };
    contentMock = {
      getTopBestContent: opts?.topBestReject
        ? vi.fn().mockRejectedValue(opts.topBestReject)
        : vi.fn().mockResolvedValue(best),
      getTopWorseContent: vi.fn().mockResolvedValue(worse),
    };
    TestBed.configureTestingModule({
      imports: [TopContentComponent],
      providers: [
        { provide: AssessmentsService, useValue: assessmentsMock },
        { provide: ContentService, useValue: contentMock },
      ],
    });
    fixture = TestBed.createComponent(TopContentComponent);
    fixture.detectChanges();
    return fixture.componentInstance;
  }

  it('loads the best and worst content of the first topic', async () => {
    const c = setup();
    await flush();
    expect(contentMock.getTopBestContent).toHaveBeenCalledWith('APIs');
    expect(contentMock.getTopWorseContent).toHaveBeenCalledWith('APIs');
    expect(c.selectedTopic()).toBe('APIs');
    expect(c.topBest()).toEqual(best);
    expect(c.topWorse()).toEqual(worse);
    expect(c.isLoadingTop()).toBe(false);
    expect(c.topUnavailable()).toBe(false);
  });

  it('reloads when the topic changes', async () => {
    const c = setup();
    await flush();
    c.onTopicChange('POO');
    await flush();
    expect(contentMock.getTopBestContent).toHaveBeenLastCalledWith('POO');
    expect(c.selectedTopic()).toBe('POO');
  });

  it('keeps the other list and flags the failure when one request fails', async () => {
    const c = setup({ topBestReject: new Error('x') });
    await flush();
    expect(c.topBest()).toEqual([]);
    expect(c.topWorse()).toEqual(worse);
    expect(c.topUnavailable()).toBe(true);
  });

  it('does not query when there are no topics', async () => {
    const c = setup({ topics: [] });
    await flush();
    expect(contentMock.getTopBestContent).not.toHaveBeenCalled();
    expect(c.topics()).toEqual([]);
  });

  it('keeps the topics empty when they cannot be loaded', async () => {
    const c = setup({ topicsReject: new Error('x') });
    await flush();
    expect(c.topics()).toEqual([]);
  });

  it('shows the rating with a single decimal and clamps the stars', () => {
    const c = setup();
    expect(c.formatRating(4.333333333333333)).toBe('4.3');
    expect(c.formatRating(4)).toBe('4.0');
    expect(c.stars(4.5)).toBe(5);
    expect(c.stars(-1)).toBe(0);
    expect(c.stars(9)).toBe(5);
  });

  it('is titled "Recursos mejor y peor valorados" and shows a rank and stars per resource', async () => {
    setup();
    await flush();
    fixture.detectChanges();
    const root = fixture.nativeElement as HTMLElement;
    expect(root.querySelector('.tc__title')?.textContent).toBe('Recursos mejor y peor valorados');
    expect(root.querySelector('.tc__col--best .tc__rank')?.textContent).toBe('1');
    expect(root.querySelectorAll('.tc__col--best .tc__star--on')).toHaveLength(5);
    expect(root.querySelectorAll('.tc__col--worse .tc__star--on')).toHaveLength(1);
  });
});
