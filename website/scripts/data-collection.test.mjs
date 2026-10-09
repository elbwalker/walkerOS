import { test } from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';

// walkeros.io runs two flows: the docs' demo flow (window.walkerjs) and the
// hosted analytics bundle (window.alst). The hosted bundle sets window.elb to
// its own collector's elb, so a route change that ran the demo flow through
// window.elb ran the hosted flow twice: two page views and two session starts
// per navigation. These tests drive the real demo flow on a jsdom page and
// stand in for the hosted bundle the way it sets up the window.
const { window } = new JSDOM('<!doctype html><body></body>', {
  url: 'https://www.walkeros.io/',
});
globalThis.window = window;
globalThis.document = window.document;

const WEBSITE = new URL('..', import.meta.url).pathname;
const { onRouteChange } = await import(`${WEBSITE}src/components/walkerjs.tsx`);

async function until(check) {
  for (let attempt = 0; attempt < 100 && !check(); attempt++)
    await new Promise((resolve) => setTimeout(resolve, 10));
}

test('a route change runs each flow once, each through its own elb', async () => {
  await onRouteChange();
  const demo = window.walkerjs;
  assert.ok(demo, 'the first page starts the demo flow');
  assert.equal(
    document.head.querySelectorAll('script[src*="cdn.walkeros.io"]').length,
    1,
  );

  // What the hosted bundle does once it has loaded.
  const hosted = [];
  window.elb = (...args) => {
    hosted.push(['elb', ...args]);
  };
  window.alst = (...args) => {
    hosted.push(['alst', ...args]);
  };

  for (const path of ['/docs/', '/playground/']) {
    window.history.pushState({}, '', path);
    const round = demo.round;
    hosted.length = 0;
    await onRouteChange();
    await until(() => demo.round > round);
    assert.equal(demo.round, round + 1, `${path}: the demo flow runs once`);
    assert.deepEqual(
      hosted,
      [['alst', 'walker run']],
      `${path}: the hosted flow runs once, through window.alst`,
    );
  }
});
