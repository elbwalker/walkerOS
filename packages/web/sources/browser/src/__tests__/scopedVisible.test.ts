import type { WalkerOS, Collector, Source } from '@walkeros/core';
import { isObject, createMockLogger } from '@walkeros/core';
import { startFlow } from '@walkeros/collector';
import type { Types } from '../types';
import { createBrowserSource } from './test-utils';
import { destroyTriggers } from '../trigger';
import { destroyVisibilityTracking } from '../triggerVisible';

const clearElbLayer = () => {
  Reflect.deleteProperty(window, 'elbLayer');
};

// Mock isVisible so the final visibility re-check inside the intersection timer
// always passes (jsdom lays nothing out).
jest.mock('@walkeros/web-core', () => ({
  ...jest.requireActual('@walkeros/web-core'),
  isVisible: jest.fn(() => true),
}));

// Cast-free IntersectionObserver stub: a class that implements the interface,
// so it is assignable to `typeof IntersectionObserver` without casts and
// exposes jest mocks for assertions.
const instances: MockIntersectionObserver[] = [];
class MockIntersectionObserver implements IntersectionObserver {
  root: Document | Element | null = null;
  rootMargin = '0px';
  thresholds: ReadonlyArray<number> = [0, 0.5];
  readonly callback: IntersectionObserverCallback;
  observe = jest.fn();
  unobserve = jest.fn();
  disconnect = jest.fn();
  takeRecords = jest.fn(() => []);

  constructor(callback: IntersectionObserverCallback) {
    this.callback = callback;
    instances.push(this);
  }
}

describe('Scoped visible (end-to-end)', () => {
  let collector: Collector.Instance;
  let mockPush: jest.MockedFunction<Collector.Instance['push']>;
  let originalIO: typeof IntersectionObserver;

  // Cast-free DOMRectReadOnly literal: the only way to construct one, since
  // its getters are read-only on the real interface.
  const rect = (r: {
    top: number;
    left: number;
    width: number;
    height: number;
  }): DOMRectReadOnly =>
    ({
      x: r.left,
      y: r.top,
      top: r.top,
      left: r.left,
      width: r.width,
      height: r.height,
      right: r.left + r.width,
      bottom: r.top + r.height,
      toJSON: () => r,
    }) as DOMRectReadOnly;

  // Drive an intersection for an element across every captured observer; only
  // the observer that actually registered the element fires a trigger. Fully
  // on screen (boundingClientRect === intersectionRect), well inside the
  // window's default size, so isEligible's coverage check passes regardless
  // of the target's real (jsdom-zeroed) layout.
  const fireVisible = (el: Element) =>
    instances.forEach((observer) => {
      const box = { top: 0, left: 0, width: 200, height: 200 };
      const entry: IntersectionObserverEntry = {
        target: el,
        time: 0,
        isIntersecting: true,
        intersectionRatio: 1,
        boundingClientRect: rect(box),
        intersectionRect: rect(box),
        rootBounds: rect({
          top: 0,
          left: 0,
          width: window.innerWidth,
          height: window.innerHeight,
        }),
      } as IntersectionObserverEntry;
      observer.callback([entry], observer);
    });

  const pushed = (trigger: string): WalkerOS.Event[] =>
    mockPush.mock.calls
      .map((call) => call[0])
      .filter(
        (event): event is WalkerOS.Event =>
          isObject(event) && event.trigger === trigger,
      );

  const showDocument = () =>
    Object.defineProperty(document, 'hidden', {
      value: false,
      writable: true,
    });

  beforeEach(async () => {
    jest.useFakeTimers();
    document.body.innerHTML = '';
    clearElbLayer();

    instances.length = 0;
    originalIO = global.IntersectionObserver;
    global.IntersectionObserver = MockIntersectionObserver;

    mockPush = jest.fn().mockImplementation(() => {
      return Promise.resolve({ ok: true });
    }) as jest.MockedFunction<Collector.Instance['push']>;

    ({ collector } = await startFlow());
    collector.push = mockPush;
  });

  afterEach(() => {
    // Module-level trigger/visibility state is shared within the file; tear it
    // down so observers and scope buckets do not leak into the next test.
    destroyTriggers();
    global.IntersectionObserver = originalIO;
    jest.useRealTimers();
    document.body.innerHTML = '';
    clearElbLayer();
  });

  test('4a walker init <element> fires visible without a usable document observer', async () => {
    // Faithful Bug-A repro: a document run builds an observer, then the SPA
    // tears the view down (no usable document observer remains). A lingering
    // document observer would mask the bug by letting the element fall back
    // onto it.
    const source = await createBrowserSource(collector, { pageview: false });
    await source.on?.('run', collector); // build the document observer
    destroyVisibilityTracking(document); // SPA clears the previous view
    mockPush.mockClear();

    document.body.innerHTML = `
      <section id="container">
        <div id="promo" data-elb="promo" data-elb-promo="id:p1" data-elbaction="visible:view"></div>
      </section>
    `;
    const container = document.getElementById('container')!;
    const promo = document.getElementById('promo')!;

    await source.elb('walker init', container);
    fireVisible(promo);
    jest.advanceTimersByTime(1000);
    await Promise.resolve();

    expect(pushed('visible')).toEqual([
      expect.objectContaining({
        name: 'promo view',
        trigger: 'visible',
        data: expect.objectContaining({ id: 'p1' }),
      }),
    ]);
  });

  test('4b walker run observes and fires document-scope visible', async () => {
    document.body.innerHTML = `
      <div id="promo" data-elb="promo" data-elb-promo="id:p1" data-elbaction="visible:view"></div>
    `;
    const promo = document.getElementById('promo')!;

    const source = await createBrowserSource(collector, { pageview: false });
    await source.on?.('run', collector);
    mockPush.mockClear();

    fireVisible(promo);
    jest.advanceTimersByTime(1000);
    await Promise.resolve();

    expect(pushed('visible')).toHaveLength(1);
  });

  test('4c double walker init re-inits cleanly (load twice, others once)', async () => {
    showDocument();
    const source = await createBrowserSource(collector, { pageview: false });
    document.body.innerHTML = `
      <section id="c">
        <div id="multi" data-elb="m" data-elb-m="id:p1"
             data-elbaction="load:view;pulse(1000):beat;wait(1000):later;hover:enter;visible:see"></div>
      </section>
    `;
    const container = document.getElementById('c')!;
    const multi = document.getElementById('multi')!;

    await source.elb('walker init', container);
    await source.elb('walker init', container);

    // load fires immediately on each init (deliberately not deduped).
    expect(pushed('load')).toHaveLength(2);

    // pulse + wait both fire on the 1000ms boundary; no stacking.
    jest.advanceTimersByTime(1000);
    await Promise.resolve();
    expect(pushed('pulse')).toHaveLength(1);
    expect(pushed('wait')).toHaveLength(1);

    // hover: one dispatch, one event.
    multi.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }));
    expect(pushed('hover')).toHaveLength(1);

    // visible: one intersection, one event.
    fireVisible(multi);
    jest.advanceTimersByTime(1000);
    await Promise.resolve();
    expect(pushed('visible')).toHaveLength(1);
  });

  test('4d double walker run re-inits cleanly (load twice, others once)', async () => {
    showDocument();
    document.body.innerHTML = `
      <div id="multi" data-elb="m" data-elb-m="id:p1"
           data-elbaction="load:view;pulse(1000):beat;wait(1000):later;hover:enter;visible:see"></div>
    `;
    const multi = document.getElementById('multi')!;

    const source = await createBrowserSource(collector, { pageview: false });
    await source.on?.('run', collector);
    await source.on?.('run', collector);

    expect(pushed('load')).toHaveLength(2);

    jest.advanceTimersByTime(1000);
    await Promise.resolve();
    expect(pushed('pulse')).toHaveLength(1);
    expect(pushed('wait')).toHaveLength(1);

    multi.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }));
    expect(pushed('hover')).toHaveLength(1);

    fireVisible(multi);
    jest.advanceTimersByTime(1000);
    await Promise.resolve();
    expect(pushed('visible')).toHaveLength(1);
  });

  test('4e walker init then walker run fires the element visible once (overlap-safe)', async () => {
    document.body.innerHTML = `
      <section id="c">
        <div id="promo" data-elb="promo" data-elb-promo="id:p1" data-elbaction="visible:view"></div>
      </section>
    `;
    const container = document.getElementById('c')!;
    const promo = document.getElementById('promo')!;

    const source = await createBrowserSource(collector, { pageview: false });
    await source.elb('walker init', container);
    await source.on?.('run', collector);
    mockPush.mockClear();

    // Overlapping visibility registrations are overlap-safe: one intersection,
    // one event. (Overlapping timer triggers across nested scopes are a
    // documented non-guarantee and are intentionally not asserted here.)
    fireVisible(promo);
    jest.advanceTimersByTime(1000);
    await Promise.resolve();

    expect(pushed('visible')).toHaveLength(1);
  });

  test('4g re-init after the subtree is removed leaks no timers and the removed element never fires', async () => {
    showDocument();
    const source = await createBrowserSource(collector, { pageview: false });
    document.body.innerHTML = `
      <section id="c">
        <div id="t" data-elb="t" data-elb-t="id:p1"
             data-elbaction="pulse(1000):beat;visible:see"></div>
      </section>
    `;
    const container = document.getElementById('c')!;
    const removed = document.getElementById('t')!;

    await source.elb('walker init', container);

    // SPA removes the subtree, then re-inits the (now empty) scope.
    container.innerHTML = '';
    await source.elb('walker init', container);
    mockPush.mockClear();

    // The prior pulse interval was cleared on re-init — no beats leak.
    jest.advanceTimersByTime(5000);
    await Promise.resolve();
    expect(pushed('pulse')).toHaveLength(0);

    // The removed element's prior observer registration was cleared.
    fireVisible(removed);
    jest.advanceTimersByTime(1000);
    await Promise.resolve();
    expect(pushed('visible')).toHaveLength(0);
  });

  test('4h destroy tears down both document and sub-scope triggers', async () => {
    showDocument();
    document.body.innerHTML = `
      <div id="docel" data-elb="d" data-elb-d="id:doc"
           data-elbaction="pulse(1000):docbeat"></div>
    `;
    const source = await createBrowserSource(collector, { pageview: false });
    await source.on?.('run', collector); // document-scope pulse + observer

    document.body.insertAdjacentHTML(
      'beforeend',
      `<section id="c">
         <div id="subel" data-elb="s" data-elb-s="id:sub"
              data-elbaction="pulse(1000):subbeat;visible:see"></div>
       </section>`,
    );
    const container = document.getElementById('c')!;
    const subel = document.getElementById('subel')!;

    await source.elb('walker init', container);

    const destroyEnv: Source.Env<Types> = {
      push: collector.push,
      command: collector.command,
      elb: collector.elb,
      window,
      document,
      logger: createMockLogger(),
    };
    await source.destroy?.({
      id: 'test-browser',
      config: source.config,
      env: destroyEnv,
      logger: createMockLogger(),
    });
    mockPush.mockClear();

    // Intervals from both scopes are cleared after destroy.
    jest.advanceTimersByTime(5000);
    await Promise.resolve();
    expect(pushed('pulse')).toHaveLength(0);

    // The sub-scope observer was disconnected; its element no longer fires.
    fireVisible(subel);
    jest.advanceTimersByTime(1000);
    await Promise.resolve();
    expect(pushed('visible')).toHaveLength(0);
  });

  test('4i destroy cancels an already-armed visible dwell timer', async () => {
    document.body.innerHTML = `
      <div id="promo" data-elb="promo" data-elb-promo="id:p1"
           data-elbaction="visible:view"></div>
    `;
    const promo = document.getElementById('promo')!;

    const source = await createBrowserSource(collector, { pageview: false });
    await source.on?.('run', collector); // document-scope observer

    // Arm the dwell timer while tracking is live, but stay short of the 1000ms
    // dwell so the trigger has not fired yet.
    fireVisible(promo);

    const destroyEnv: Source.Env<Types> = {
      push: collector.push,
      command: collector.command,
      elb: collector.elb,
      window,
      document,
      logger: createMockLogger(),
    };
    await source.destroy?.({
      id: 'test-browser',
      config: source.config,
      env: destroyEnv,
      logger: createMockLogger(),
    });
    mockPush.mockClear();

    // The armed timer must be cancelled by destroy; advancing past the dwell
    // fires nothing.
    jest.advanceTimersByTime(1000);
    await Promise.resolve();
    expect(pushed('visible')).toHaveLength(0);
  });

  test('4j destroy cancels a sub-scope armed timer when a document scope shares the observer', async () => {
    // Two scope-states share one per-document observer: the document scope
    // (docel) and a `walker init` sub-scope (subel). The document scope is torn
    // down first; its destroy must not delete the shared visibility state
    // before the sub-scope's armed timer is cancelled.
    document.body.innerHTML = `
      <div id="docel" data-elb="d" data-elb-d="id:doc"
           data-elbaction="visible:docsee"></div>
    `;
    const source = await createBrowserSource(collector, { pageview: false });
    await source.on?.('run', collector); // document scope-state + shared observer

    document.body.insertAdjacentHTML(
      'beforeend',
      `<section id="c">
         <div id="subel" data-elb="s" data-elb-s="id:sub"
              data-elbaction="visible:see"></div>
       </section>`,
    );
    const container = document.getElementById('c')!;
    const subel = document.getElementById('subel')!;

    await source.elb('walker init', container); // sub-scope, same document

    // Arm the SUB-SCOPE element's dwell timer while the shared per-document
    // visibility state is still live, short of the 1000ms dwell.
    fireVisible(subel);

    const destroyEnv: Source.Env<Types> = {
      push: collector.push,
      command: collector.command,
      elb: collector.elb,
      window,
      document,
      logger: createMockLogger(),
    };
    await source.destroy?.({
      id: 'test-browser',
      config: source.config,
      env: destroyEnv,
      logger: createMockLogger(),
    });
    mockPush.mockClear();

    // Advancing past the dwell must fire nothing: the sub-scope timer was
    // cancelled before any scope deleted the shared per-document state.
    jest.advanceTimersByTime(1000);
    await Promise.resolve();
    expect(pushed('visible')).toHaveLength(0);
  });
});
