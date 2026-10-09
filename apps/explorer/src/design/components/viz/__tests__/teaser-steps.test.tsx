import React from 'react';
import { act, fireEvent, render } from '@testing-library/react';
import { ArticleTeaserTracking } from '../ArticleTeaserTracking';
import {
  TEASER_CAPTIONS,
  TEASER_ITEMS,
  TEASER_STEPS,
  teaserStepEnd,
  teaserStepStart,
  type TeaserStep,
} from '../data/article-teaser';
import { observeAs, preferReducedMotion } from './browser';

// The whole autoplay walk takes 37.5 s; a minute is past any step's end.
const MINUTE = 60_000;

/** Runs the timers in small steps, so each one's state lands before the next. */
function play(ms: number): void {
  for (let elapsed = 0; elapsed < ms; elapsed += 100)
    act(() => {
      jest.advanceTimersByTime(100);
    });
}

function frame(container: HTMLElement) {
  return {
    lines: container.querySelectorAll('.elb-viz-teaser__line--visible').length,
    caption: container.querySelector('.elb-viz-teaser__caption')?.textContent,
    pressed: Array.from(
      container.querySelectorAll('.elb-viz-teaser__step'),
      (button) => button.getAttribute('aria-pressed'),
    ),
  };
}

function click(container: HTMLElement, step: TeaserStep): void {
  const { label } = TEASER_STEPS[step - 1];
  const button = container.querySelector(
    `[aria-label="Step ${step}: ${label}"]`,
  );
  if (!(button instanceof HTMLButtonElement)) throw new Error('no step button');
  fireEvent.click(button);
}

const pressedOnly = (step: TeaserStep) =>
  TEASER_STEPS.map((item) => String(item.step === step));

afterEach(() => {
  Reflect.deleteProperty(window, 'matchMedia');
  Reflect.deleteProperty(window, 'IntersectionObserver');
});

describe('teaser steps', () => {
  beforeEach(() => {
    observeAs(true);
  });

  it('autoplay without a click walks every step and ends on the last', () => {
    const { container } = render(<ArticleTeaserTracking />);
    play(MINUTE);
    expect(frame(container)).toMatchObject({
      lines: TEASER_ITEMS.length,
      caption: TEASER_CAPTIONS[5],
      pressed: pressedOnly(5),
    });
    expect(jest.getTimerCount()).toBe(0);
  });

  // A click during autoplay: the step's start (the lines before it), then its
  // end, and no timer left to move on.
  it.each(TEASER_STEPS.map(({ step }) => step))(
    'a click on step %i replays it from its start and stops at its end',
    (step) => {
      const { container } = render(<ArticleTeaserTracking />);
      play(25_000);

      click(container, step);
      expect(frame(container).lines).toBe(teaserStepStart(step));

      play(MINUTE);
      expect(frame(container)).toMatchObject({
        lines: teaserStepEnd(step),
        caption: TEASER_CAPTIONS[step],
        pressed: pressedOnly(step),
      });
      expect(jest.getTimerCount()).toBe(0);
    },
  );

  it('a later click pins the other step instead', () => {
    const { container } = render(<ArticleTeaserTracking />);
    click(container, 2);
    play(MINUTE);
    click(container, 4);
    play(MINUTE);
    expect(frame(container)).toMatchObject({
      lines: teaserStepEnd(4),
      caption: TEASER_CAPTIONS[4],
      pressed: pressedOnly(4),
    });
  });

  it('without autoplay a click shows the step at its end and stays', () => {
    const { container } = render(<ArticleTeaserTracking autoplay={false} />);
    click(container, 3);
    play(MINUTE);
    expect(frame(container)).toMatchObject({
      lines: teaserStepEnd(3),
      caption: TEASER_CAPTIONS[3],
      pressed: pressedOnly(3),
    });
  });

  it('with reduced motion a click shows the step at its end and stays', () => {
    preferReducedMotion();
    const { container } = render(<ArticleTeaserTracking />);
    click(container, 2);
    play(MINUTE);
    expect(frame(container)).toMatchObject({
      lines: teaserStepEnd(2),
      caption: TEASER_CAPTIONS[2],
      pressed: pressedOnly(2),
    });
  });
});
