import React, { type ReactElement } from 'react';
import { renderToString } from 'react-dom/server';
import { hydrateRoot, type Root } from 'react-dom/client';
import { act, render } from '@testing-library/react';
import { ArticleTeaserTracking } from '../ArticleTeaserTracking';
import { DestinationMappingViz } from '../DestinationMappingViz';
import { HeroTaggingViz } from '../HeroTaggingViz';
import { TEASER_CAPTIONS, TEASER_ITEMS } from '../data/article-teaser';
import { HERO_ARTICLES, heroEvents } from '../data/hero';
import { observeAs, preferReducedMotion } from './browser';

const DEMOS: ReadonlyArray<readonly [string, () => ReactElement]> = [
  ['HeroTaggingViz', () => <HeroTaggingViz />],
  ['ArticleTeaserTracking', () => <ArticleTeaserTracking />],
  ['DestinationMappingViz', () => <DestinationMappingViz />],
];

function serverHtml(element: ReactElement): HTMLElement {
  const container = document.createElement('div');
  container.innerHTML = renderToString(element);
  document.body.append(container);
  return container;
}

afterEach(() => {
  Reflect.deleteProperty(window, 'matchMedia');
  Reflect.deleteProperty(window, 'IntersectionObserver');
  jest.restoreAllMocks();
});

describe.each(DEMOS)('%s', (_name, make) => {
  // The server HTML is the first frame; any difference would make React
  // re-render on load and warn.
  it('hydrates its server HTML without a mismatch', async () => {
    const container = serverHtml(make());
    const errors: unknown[] = [];
    const consoleError = jest
      .spyOn(console, 'error')
      .mockImplementation(() => {});
    let root: Root | undefined;
    await act(async () => {
      root = hydrateRoot(container, make(), {
        onRecoverableError: (error) => errors.push(error),
      });
    });
    expect(errors).toEqual([]);
    expect(consoleError).not.toHaveBeenCalled();
    act(() => root?.unmount());
  });

  // The demo shows tagging as text; live attributes would fire the site's own
  // walkerOS flow.
  it('puts no live data-elb attribute in the page', () => {
    const { container } = render(make());
    const names = Array.from(container.querySelectorAll('*')).flatMap(
      (element) => element.getAttributeNames(),
    );
    expect(names.filter((name) => name.startsWith('data-elb'))).toEqual([]);
  });
});

describe('first frames, on the server and in the first client frame', () => {
  it('hero: the first article fully tagged, both of its events in the table', () => {
    const container = serverHtml(<HeroTaggingViz />);
    const [article] = HERO_ARTICLES;
    const json = JSON.stringify(heroEvents(article)[0].data);
    expect(
      Array.from(
        container.querySelectorAll('.elb-viz-table__row--event'),
        (row) => row.textContent,
      ),
    ).toEqual([`1article open${json}`, `2article impression${json}`]);
    expect(
      container.querySelector('.elb-viz-hero__card--tagged'),
    ).not.toBeNull();
    expect(container.querySelector('.elb-viz-caret')).toBeNull();
  });

  it('teaser: step 0, no line shown, the first caption', () => {
    const container = serverHtml(<ArticleTeaserTracking />);
    expect(
      container.querySelectorAll('.elb-viz-teaser__line--visible'),
    ).toHaveLength(0);
    expect(
      container.querySelector('.elb-viz-teaser__caption')?.textContent,
    ).toBe(TEASER_CAPTIONS[1]);
  });

  it('mapping: the first event chosen', () => {
    const container = serverHtml(<DestinationMappingViz />);
    expect(
      Array.from(container.querySelectorAll('[aria-pressed]'), (chip) =>
        chip.getAttribute('aria-pressed'),
      ),
    ).toEqual(['true', 'false', 'false']);
  });
});

// Below 640px the cards stack, and the narrow rule hides what a step has not
// reached (jsdom evaluates no container query, so this checks the classes it
// targets). The first card stands for the tagged teaser from step 1.
describe('teaser: what a step has not reached yet', () => {
  const ahead = (container: HTMLElement, part: 'card' | 'page') =>
    Array.from(
      container.querySelectorAll(`.elb-viz-teaser__${part}`),
      (element) => element.classList.contains(`elb-viz-teaser__${part}--ahead`),
    );

  it('the server frame: only the first card, the article list hidden', () => {
    const container = serverHtml(<ArticleTeaserTracking />);
    expect(ahead(container, 'card')).toEqual([
      false,
      true,
      true,
      true,
      true,
      true,
    ]);
    expect(ahead(container, 'page')).toEqual([false, true]);
  });

  it.each([
    [1, [false, true, true, true, true, true], [false, true]],
    [2, [false, true, true, true, true, true], [false, true]],
    [3, [false, false, false, true, true, true], [false, true]],
    [4, [false, false, false, false, false, false], [false, false]],
    [5, [false, false, false, false, false, false], [false, false]],
  ] as const)('step %i', (step, cards, pages) => {
    const { container } = render(
      <ArticleTeaserTracking autoplay={false} initialStep={step} />,
    );
    expect(ahead(container, 'card')).toEqual(cards);
    expect(ahead(container, 'page')).toEqual(pages);
  });

  it('reduced motion: nothing hidden', () => {
    preferReducedMotion();
    const { container } = render(<ArticleTeaserTracking />);
    expect(ahead(container, 'card')).not.toContain(true);
    expect(ahead(container, 'page')).not.toContain(true);
  });
});

describe('reduced motion', () => {
  beforeEach(preferReducedMotion);

  it('hero: no animation frame, the first frame stays', () => {
    const frames = jest.spyOn(window, 'requestAnimationFrame');
    const { container } = render(<HeroTaggingViz />);
    act(() => {
      jest.advanceTimersByTime(2000);
    });
    expect(frames).not.toHaveBeenCalled();
    expect(
      container.querySelectorAll('.elb-viz-table__row--event'),
    ).toHaveLength(2);
  });

  it('teaser: the finished walk-through and the last caption', () => {
    const { container } = render(<ArticleTeaserTracking />);
    expect(
      container.querySelectorAll('.elb-viz-teaser__line--visible'),
    ).toHaveLength(TEASER_ITEMS.length);
    expect(
      container.querySelector('.elb-viz-teaser__caption')?.textContent,
    ).toBe(TEASER_CAPTIONS[5]);
  });
});

describe('animation only while in view', () => {
  it('hero: no frame while out of view, frames once in view', () => {
    const frames = jest.spyOn(window, 'requestAnimationFrame');
    observeAs(false);
    const hidden = render(<HeroTaggingViz />);
    expect(frames).not.toHaveBeenCalled();
    hidden.unmount();
    observeAs(true);
    render(<HeroTaggingViz />);
    expect(frames).toHaveBeenCalled();
  });

  it('teaser: autoplay waits until the code pane is in view', () => {
    observeAs(false);
    const hidden = render(<ArticleTeaserTracking />);
    act(() => {
      jest.advanceTimersByTime(5000);
    });
    expect(
      hidden.container.querySelectorAll('.elb-viz-teaser__line--visible'),
    ).toHaveLength(0);
    hidden.unmount();
    observeAs(true);
    const shown = render(<ArticleTeaserTracking />);
    act(() => {
      jest.advanceTimersByTime(800);
    });
    expect(
      shown.container.querySelectorAll('.elb-viz-teaser__line--visible').length,
    ).toBeGreaterThan(0);
  });
});
