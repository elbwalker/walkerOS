import type { Source, WalkerOS, Collector, Logger } from '@walkeros/core';
import { Level } from '@walkeros/core';
import { startFlow, createPushResult } from '@walkeros/collector';
import { sourceBrowser, __resetInstanceCountForTests } from '../index';
import { destroyTriggers } from '../trigger';
import { flushChain } from './test-utils';
import type { BrowserPush } from '../types';

/**
 * Regression contract for the mitgas.de production funnel.
 *
 * On mitgas.de an Angular app injects a tagged product slider and then pushes
 * `['walker init', sliderElement]` into `window.elbLayer`. Under the old
 * architecture the elbLayer wrapper short-circuited walker commands to the
 * collector, which had no `init` handler and silently returned ok:true — so
 * IntersectionObserver was never attached and `product visible` never fired.
 *
 * The flow mirrors mitgas's shape: `cmp` occupies sources[0], `browser` is the
 * consent-gated primary (`require: ['consent']`), `session` trails. walker.js
 * is injected by GTM only after consent, so pushes can land before AND after
 * the source boots. These tests drive the real index.ts wiring end to end
 * through `window.elbLayer` / `window.elb`, the append-only controller, the
 * translation layer, and `initScope`.
 */

// Cast-free IntersectionObserver stub (mirrors scopedVisible.test.ts): a class
// implementing the interface, assignable to `typeof IntersectionObserver`
// without casts, exposing typed jest mocks so observe() calls carry Element.
const observerInstances: MockIntersectionObserver[] = [];
class MockIntersectionObserver implements IntersectionObserver {
  root: Document | Element | null = null;
  rootMargin = '0px';
  thresholds: ReadonlyArray<number> = [0, 0.5];
  readonly callback: IntersectionObserverCallback;
  observe: jest.Mock<void, [Element]> = jest.fn();
  unobserve: jest.Mock<void, [Element]> = jest.fn();
  disconnect: jest.Mock<void, []> = jest.fn();
  takeRecords: jest.Mock<IntersectionObserverEntry[], []> = jest.fn(() => []);

  constructor(callback: IntersectionObserverCallback) {
    this.callback = callback;
    observerInstances.push(this);
  }
}

// Every element registered on any captured observer. The observer is keyed by
// ownerDocument, so a `walker init <slider>` reuses the document observer built
// on run; flattening across instances stays correct regardless.
const observedElements = (): Element[] =>
  observerInstances.flatMap((observer) =>
    observer.observe.mock.calls.map((call) => call[0]),
  );

interface LogEntry {
  level: Level;
  message: string;
  context: Logger.LogContext;
  scope: string[];
}

// A minimal, side-effect-free source that only occupies a slot in the flow —
// used to place `cmp` at sources[0] and `session` after the browser so the
// browser is the consent-gated primary that is NOT the first source.
const createDummySource =
  (type: string): Source.Init =>
  () => ({
    type,
    config: {},
    push: async () => createPushResult({ ok: true }),
  });

interface Booted {
  collector: Collector.Instance;
  recorded: WalkerOS.Event[];
  logs: LogEntry[];
}

// The chains span the multi-source consent/run cascade plus the controller's
// serialized replay, which is deeper than a single package suite. Drain twice
// so every microtask link settles before assertions.
const settle = async (): Promise<void> => {
  await flushChain();
  await flushChain();
};

// Boot the mitgas-shaped flow: cmp first, consent-gated primary browser,
// session last, plus a recording destination that captures delivered events in
// order and a WARN-level log handler. `run: true` mirrors mitgas booting
// pre-consent. An optional pre-seeded backlog models GTM ordering.
const bootFlow = async (
  browserSettings: { pageview: boolean },
  seedLayer?: unknown[][],
): Promise<Booted> => {
  if (seedLayer) Reflect.set(window, 'elbLayer', seedLayer);

  const recorded: WalkerOS.Event[] = [];
  const logs: LogEntry[] = [];
  const handler: Logger.Handler = (level, message, context, scope) => {
    logs.push({ level, message, context, scope });
  };

  const { collector } = await startFlow({
    run: true,
    logger: { level: 'WARN', handler },
    destinations: {
      record: {
        code: {
          type: 'record',
          config: {},
          push: (event) => {
            recorded.push(event);
          },
        },
      },
    },
    sources: {
      cmp: { code: createDummySource('cmp') },
      browser: {
        code: sourceBrowser,
        primary: true,
        config: {
          require: ['consent'],
          settings: { pageview: browserSettings.pageview, prefix: 'data-elb' },
        },
      },
      session: { code: createDummySource('session') },
    },
  });

  await settle();
  return { collector, recorded, logs };
};

const grantConsent = async (collector: Collector.Instance): Promise<void> => {
  await collector.command('consent', { functional: true });
  await settle();
};

const isBrowserPush = (value: unknown): value is BrowserPush =>
  typeof value === 'function';

const readWindowElb = (): BrowserPush => {
  const value = Reflect.get(window, 'elb');
  if (!isBrowserPush(value)) throw new Error('window.elb not installed');
  return value;
};

const readLayer = (): unknown[] => {
  const value = Reflect.get(window, 'elbLayer');
  if (!Array.isArray(value)) throw new Error('window.elbLayer missing');
  return value;
};

// A tagged product slider: a container whose children each carry a `visible`
// action, exactly like the mitgas slider Angular injects.
const buildSlider = (
  ids: string[],
): { container: HTMLElement; products: HTMLElement[] } => {
  const container = document.createElement('div');
  const products = ids.map((id) => {
    const product = document.createElement('div');
    product.setAttribute('data-elb', 'product');
    product.setAttribute('data-elb-product', `id:${id}`);
    product.setAttribute('data-elbaction', 'visible:visible');
    container.appendChild(product);
    return product;
  });
  document.body.appendChild(container);
  return { container, products };
};

describe('elbLayer funnel (mitgas shape)', () => {
  let originalIO: typeof IntersectionObserver;

  beforeEach(() => {
    document.body.innerHTML = '';
    Reflect.deleteProperty(window, 'elbLayer');
    Reflect.deleteProperty(window, 'elb');
    __resetInstanceCountForTests();

    observerInstances.length = 0;
    originalIO = global.IntersectionObserver;
    global.IntersectionObserver = MockIntersectionObserver;
  });

  afterEach(() => {
    // Transitively disconnects the per-document IntersectionObserver: it
    // iterates the scope registry and calls destroyVisibilityTracking for each
    // scope, so no observer leaks into the next test (mirrors scopedVisible).
    destroyTriggers();
    global.IntersectionObserver = originalIO;
    document.body.innerHTML = '';
    Reflect.deleteProperty(window, 'elbLayer');
    Reflect.deleteProperty(window, 'elb');
  });

  test('post-boot walker init attaches the observer to injected slider products and stays in the layer', async () => {
    const { collector } = await bootFlow({ pageview: false });

    // Flow shape: browser is the primary despite cmp occupying sources[0].
    expect(Object.keys(collector.sources)[0]).toBe('cmp');
    expect(collector.sources.browser.config.primary).toBe(true);

    // walker.js boots after consent (GTM). Grant it, then inject the slider.
    await grantConsent(collector);

    const slider = buildSlider(['p1', 'p2', 'p3']);
    const layer = readLayer();
    layer.push(['walker init', slider.container]);
    await settle();

    const observed = observedElements();
    for (const product of slider.products) expect(observed).toContain(product);

    // Append-only: the command entry is still in window.elbLayer.
    expect(
      layer.some(
        (entry) =>
          Array.isArray(entry) &&
          entry[0] === 'walker init' &&
          entry[1] === slider.container,
      ),
    ).toBe(true);

    // Same funnel via window.elb on a second slider; the promise resolves ok.
    const second = buildSlider(['q1', 'q2', 'q3']);
    const result = await readWindowElb()('walker init', second.container);
    await settle();

    expect(result).toEqual(expect.objectContaining({ ok: true }));
    const observedAfter = observedElements();
    for (const product of second.products)
      expect(observedAfter).toContain(product);

    // Single-writer funnel: the window.elb path records into the same
    // append-only layer, so its entry is retained too.
    expect(
      layer.some(
        (entry) =>
          Array.isArray(entry) &&
          entry[0] === 'walker init' &&
          entry[1] === second.container,
      ),
    ).toBe(true);
  });

  test('pre-boot backlog: a layer-pushed walker consent grants and the queued event is delivered after start', async () => {
    const { collector, recorded } = await bootFlow({ pageview: false }, [
      ['walker consent', { functional: true }],
      ['product view', { id: 'queued' }],
    ]);

    // Consent pushed through the layer reached the collector.
    expect(collector.consent.functional).toBe(true);

    // The browser source activated: require satisfied, init complete.
    expect(collector.sources.browser.config.require?.length || 0).toBe(0);
    expect(collector.sources.browser.config.init).toBe(true);

    // The queued event was replayed to the destination — nothing dropped.
    expect(
      recorded.some(
        (event) => event.name === 'product view' && event.data.id === 'queued',
      ),
    ).toBe(true);

    // Append-only: both seeded entries remain in the layer.
    expect(readLayer().length).toBe(2);
  });

  test('ordering: a pre-boot backlog event is delivered before the run pageview', async () => {
    const { collector, recorded } = await bootFlow({ pageview: true }, [
      ['product view', { id: 'backlog' }],
    ]);
    await grantConsent(collector);

    const names = recorded.map((event) => event.name);
    const backlogIndex = names.indexOf('product view');
    const pageviewIndex = names.indexOf('page view');

    expect(backlogIndex).toBeGreaterThanOrEqual(0);
    expect(pageviewIndex).toBeGreaterThanOrEqual(0);
    expect(backlogIndex).toBeLessThan(pageviewIndex);
  });

  test('an unknown walker command warns and does not break the chain', async () => {
    const { collector, recorded, logs } = await bootFlow({ pageview: false });
    await grantConsent(collector);

    const layer = readLayer();
    layer.push(['walker nonsense']);
    await settle();

    expect(
      logs.some(
        (entry) =>
          entry.level === Level.WARN &&
          entry.message === 'unknown command' &&
          entry.context.command === 'nonsense',
      ),
    ).toBe(true);

    // The chain is still alive: a subsequent valid event is delivered.
    layer.push(['product view', { id: 'after' }]);
    await settle();

    expect(
      recorded.some(
        (event) => event.name === 'product view' && event.data.id === 'after',
      ),
    ).toBe(true);
  });

  test('walker init on an untagged subtree routes to the browser layer, not the collector', async () => {
    const { collector, logs } = await bootFlow({ pageview: false });
    await grantConsent(collector);

    const before = observedElements().length;

    const empty = document.createElement('div');
    empty.innerHTML = '<p>nothing tagged</p>';
    document.body.appendChild(empty);

    const result = await readWindowElb()('walker init', empty);
    await settle();

    // init is known to the browser layer: it resolves ok, observes nothing,
    // and never reaches the collector's unknown-command path.
    expect(result).toEqual(expect.objectContaining({ ok: true }));
    expect(observedElements().length).toBe(before);
    expect(logs.some((entry) => entry.message === 'unknown command')).toBe(
      false,
    );
  });
});
