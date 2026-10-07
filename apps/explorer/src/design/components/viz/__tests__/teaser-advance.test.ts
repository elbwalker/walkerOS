import {
  TEASER_ITEMS,
  teaserAdvance,
  teaserStepEnd,
  teaserStepStart,
  type TeaserStep,
} from '../data/article-teaser';

it('lists 34 items over five steps', () => {
  const steps: TeaserStep[] = [1, 2, 3, 4, 5];
  expect(TEASER_ITEMS).toHaveLength(34);
  expect(
    steps.map((step) => [teaserStepStart(step), teaserStepEnd(step)]),
  ).toEqual([
    [0, 6],
    [6, 18],
    [18, 22],
    [22, 26],
    [26, 34],
  ]);
});

// The artifact's autoplay (viz.jsx:372-385): files open alone after 1.3 s,
// lines run to the next effect after 1.7 s, a new step waits 1.6 s more.
it('autoplays with the artifact timing and ends after the last line', () => {
  const walk: Array<[number, number | null]> = [];
  let step = teaserAdvance(0);
  while (step) {
    walk.push([step.next, step.delay]);
    step = teaserAdvance(step.next);
  }
  expect(walk).toEqual([
    [1, 1300],
    [3, 1700],
    [6, 3300],
    [7, 1300],
    [11, 1700],
    [12, 1700],
    [13, 1700],
    [14, 1700],
    [15, 1700],
    [18, 3300],
    [19, 1300],
    [20, 1700],
    [22, 3300],
    [23, 1300],
    [24, 1700],
    [26, 3300],
    [27, 1300],
    [28, 1700],
    [32, 1700],
    [34, null],
  ]);
});
