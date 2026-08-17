import type {
  Collector,
  Ingest,
  MockLogger,
  Source,
  WalkerOS,
} from '@walkeros/core';
import { createIngest, createMockLogger } from '@walkeros/core';
import { startFlow } from '@walkeros/collector';
import { sourceBrowser } from '../index';
import { destroyBrowserSource, flushChain } from './test-utils';
import type { Types } from '../types';

/**
 * Two browser sources on one page, driven end to end through the real factory
 * and a real collector each. The subject is the contract a page owner and a
 * vendor both depend on: each source captures into its own pipeline, owns the
 * page-global names it asked for, and neither one's init, scan or teardown can
 * silence the other.
 *
 * Every "still works after X" claim carries a positive control taken before X,
 * so a silent channel fails the control rather than passing the claim.
 */

// The dwell's final occlusion probe reads real layout, which jsdom cannot
// answer. Geometry is not the subject here.
jest.mock('@walkeros/web-core', () => ({
  ...jest.requireActual('@walkeros/web-core'),
  isVisible: jest.fn(() => true),
}));

interface Built {
  source: Source.Instance<Types>;
  logger: MockLogger;
  collector: Collector.Instance;
}

interface Flow {
  collector: Collector.Instance;
  events: WalkerOS.Event[];
}

interface Box {
  top: number;
  left: number;
  width: number;
  height: number;
}

// jsdom ships no IntersectionObserver. A class implementing the interface is
// assignable to the global without a cast and hands the suite every observer
// that gets created, so an entry can be delivered to all of them at once: only
// the source that registered the element reacts.
const observers: MockIntersectionObserver[] = [];
class MockIntersectionObserver implements IntersectionObserver {
  root: Document | Element | null = null;
  rootMargin = '0px';
  thresholds: ReadonlyArray<number> = [0, 1];
  readonly callback: IntersectionObserverCallback;
  observe = jest.fn();
  unobserve = jest.fn();
  disconnect = jest.fn();
  takeRecords = jest.fn(() => []);

  constructor(callback: IntersectionObserverCallback) {
    this.callback = callback;
    observers.push(this);
  }
}

const rect = (box: Box): DOMRectReadOnly => ({
  x: box.left,
  y: box.top,
  top: box.top,
  left: box.left,
  width: box.width,
  height: box.height,
  right: box.left + box.width,
  bottom: box.top + box.height,
  toJSON: () => box,
});

// Deliver one intersection entry to every live observer. Fully on screen and
// well inside the viewport, so eligibility does not depend on jsdom's zeroed
// layout. `intersecting: false` is the below-the-bar entry that cancels an
// armed dwell and re-arms a repeating trigger.
const fireVisible = (element: Element, intersecting: boolean): void => {
  const box: Box = { top: 0, left: 0, width: 200, height: 200 };
  const empty: Box = { top: 0, left: 0, width: 0, height: 0 };
  const entry: IntersectionObserverEntry = {
    target: element,
    time: 0,
    isIntersecting: intersecting,
    intersectionRatio: intersecting ? 1 : 0,
    boundingClientRect: rect(box),
    intersectionRect: rect(intersecting ? box : empty),
    rootBounds: rect({
      top: 0,
      left: 0,
      width: window.innerWidth,
      height: window.innerHeight,
    }),
  };
  observers.forEach((observer) => observer.callback([entry], observer));
};

const built: Built[] = [];

// One collector per source, each with a recording destination, so "which
// pipeline did this event reach" is answerable.
const startRecordingFlow = async (): Promise<Flow> => {
  const events: WalkerOS.Event[] = [];
  const { collector } = await startFlow({
    run: true,
    destinations: {
      record: {
        code: {
          type: 'record',
          config: {},
          push: (event) => {
            events.push(event);
          },
        },
      },
    },
  });
  return { collector, events };
};

const buildSource = async (
  flow: Flow,
  settings: Partial<Source.Settings<Types>> = {},
): Promise<Built> => {
  const logger = createMockLogger();
  const { collector } = flow;
  const env: Source.Env<Types> = {
    push: collector.push,
    command: collector.command,
    elb: collector.elb,
    window,
    document,
    logger,
  };

  const source = await sourceBrowser({
    collector,
    config: {
      settings: {
        prefix: 'data-elb',
        scope: document,
        pageview: false,
        elb: 'elb',
        elbLayer: 'elbLayer',
        ...settings,
      },
    },
    env,
    id: 'test-browser',
    logger,
    withScope: async (_raw, respond, body) => {
      const ingest: Ingest = createIngest('test-browser');
      return body({ ...env, push: env.push, ingest, respond });
    },
  });

  const instance: Built = { source, logger, collector };
  built.push(instance);
  return instance;
};

// Build, then drive the two lifecycle steps the collector drives: init
// (adoption, listeners, window.elb) and, optionally, run (scan + pageview).
const bootSource = async (
  flow: Flow,
  settings: Partial<Source.Settings<Types>> = {},
  options: { run?: boolean } = {},
): Promise<Built> => {
  const instance = await buildSource(flow, settings);
  await instance.source.init?.();
  if (options.run) {
    await instance.source.on?.('run', flow.collector);
    await flushChain();
  }
  return instance;
};

const readWindow = (key: string): unknown => Reflect.get(window, key);

const readLayerPush = (name: string): unknown => {
  const layer: unknown = readWindow(name);
  return Array.isArray(layer) ? Reflect.get(layer, 'push') : undefined;
};

// Call the writer currently installed under `name`, read fresh at call time: a
// page calls the global it finds now, never a reference it captured earlier.
const callWriter = async (
  name: string,
  ...args: unknown[]
): Promise<unknown> => {
  const writer: unknown = readWindow(name);
  if (typeof writer !== 'function') throw new Error(`window.${name} missing`);
  return writer(...args);
};

const readLayer = (name: string): unknown[] => {
  const layer: unknown = readWindow(name);
  if (!Array.isArray(layer)) throw new Error(`window.${name} missing`);
  return layer;
};

const errorMessages = (logger: MockLogger): string[] =>
  logger.error.mock.calls.map((call) => String(call[0]));

const errorsAbout = (logger: MockLogger, resource: string): string[] =>
  errorMessages(logger).filter((message) => message.startsWith(`${resource} `));

const named = (events: WalkerOS.Event[], name: string): WalkerOS.Event[] =>
  events.filter((event) => event.name === name);

const tagged = (entity: string, action: string): HTMLDivElement => {
  const element = document.createElement('div');
  element.setAttribute('data-elb', entity);
  element.setAttribute('data-elbaction', action);
  return element;
};

const click = (element: Element): void => {
  element.dispatchEvent(new MouseEvent('click', { bubbles: true }));
};

// Every page-global name any test in this file installs.
const windowNames = [
  'elb',
  'elbLayer',
  'elbB',
  'layerB',
  'vendorElb',
  'vendorLayer',
];

const clearWindowState = (): void => {
  windowNames.forEach((name) => Reflect.deleteProperty(window, name));
};

describe('parallel browser sources', () => {
  let originalObserver: typeof IntersectionObserver;

  beforeEach(() => {
    document.body.innerHTML = '';
    clearWindowState();
    observers.length = 0;
    originalObserver = global.IntersectionObserver;
    global.IntersectionObserver = MockIntersectionObserver;
  });

  afterEach(async () => {
    // Every source is torn down through the production destroy path, so its
    // listeners, timers and observers do not reach into the next test.
    const sources = built.splice(0, built.length);
    for (const instance of sources)
      await destroyBrowserSource(instance.source, instance.collector);
    global.IntersectionObserver = originalObserver;
    document.body.innerHTML = '';
    clearWindowState();
    jest.useRealTimers();
  });

  test('a vendor source with its own names captures beside the page walker', async () => {
    const flowA = await startRecordingFlow();
    const flowB = await startRecordingFlow();

    const button = tagged('p', 'click:view');
    document.body.appendChild(button);

    const first = await bootSource(flowA, {}, { run: true });

    // Positive control: the page walker captures before the vendor exists.
    click(button);
    await flushChain();
    expect(named(flowA.events, 'p view')).toHaveLength(1);
    flowA.events.length = 0;

    const pagePush = readLayerPush('elbLayer');
    const pageElb = readWindow('elb');

    const second = await bootSource(
      flowB,
      {
        elb: 'vendorElb',
        elbLayer: 'vendorLayer',
        scope: document.body,
        pageview: false,
      },
      { run: true },
    );

    // Distinct names mean nothing is refused, on either side.
    expect(errorMessages(first.logger)).toHaveLength(0);
    expect(errorMessages(second.logger)).toHaveLength(0);

    // The page walker's globals are exactly the ones it installed.
    expect(readLayerPush('elbLayer')).toBe(pagePush);
    expect(readWindow('elb')).toBe(pageElb);
    // The vendor's are its own, and separate.
    expect(typeof readLayerPush('vendorLayer')).toBe('function');
    expect(readLayerPush('vendorLayer')).not.toBe(pagePush);
    expect(typeof readWindow('vendorElb')).toBe('function');
    expect(readWindow('vendorElb')).not.toBe(pageElb);

    // One click, both delegations: neither source disarmed the other.
    click(button);
    await flushChain();
    expect(named(flowA.events, 'p view')).toHaveLength(1);
    expect(named(flowB.events, 'p view')).toHaveLength(1);
  });

  test('an overlay source runs with no page-window footprint at all', async () => {
    const flowA = await startRecordingFlow();
    const flowB = await startRecordingFlow();

    const pageButton = tagged('p', 'click:view');
    document.body.appendChild(pageButton);

    const host = document.createElement('div');
    document.body.appendChild(host);
    // A closed root: the page walker's delegation is retargeted to the host,
    // which carries no tags, so the overlay's clicks are its own.
    const overlay = host.attachShadow({ mode: 'closed' });
    const overlayButton = tagged('overlay', 'click:open');
    overlay.appendChild(overlayButton);

    const first = await bootSource(flowA, {}, { run: true });

    // Positive control: the page walker captures before the overlay exists.
    click(pageButton);
    await flushChain();
    expect(named(flowA.events, 'p view')).toHaveLength(1);
    flowA.events.length = 0;

    const pagePush = readLayerPush('elbLayer');
    const pageElb = readWindow('elb');
    const before = new Set(Object.getOwnPropertyNames(window));

    const second = await bootSource(
      flowB,
      { elb: false, elbLayer: false, scope: overlay },
      { run: true },
    );

    expect(errorMessages(first.logger)).toHaveLength(0);
    expect(errorMessages(second.logger)).toHaveLength(0);

    // The whole point of the embedded posture: not one new page global. Own
    // property names rather than keys, so a non-enumerable install counts too.
    const added = Object.getOwnPropertyNames(window).filter(
      (key) => !before.has(key),
    );
    expect(added).toEqual([]);
    expect(readLayerPush('elbLayer')).toBe(pagePush);
    expect(readWindow('elb')).toBe(pageElb);

    click(overlayButton);
    await flushChain();
    expect(named(flowB.events, 'overlay open')).toHaveLength(1);
    expect(named(flowA.events, 'overlay open')).toHaveLength(0);

    click(pageButton);
    await flushChain();
    expect(named(flowA.events, 'p view')).toHaveLength(1);
    expect(named(flowB.events, 'p view')).toHaveLength(0);
  });

  test('a layer two sources ask for keeps routing to its owner alone', async () => {
    const flowA = await startRecordingFlow();
    const flowB = await startRecordingFlow();

    const scopeB = document.createElement('div');
    const buttonB = tagged('b', 'click:go');
    scopeB.appendChild(buttonB);
    document.body.appendChild(scopeB);

    await bootSource(flowA, {}, { run: true });
    const second = await bootSource(
      flowB,
      { elb: 'elbB', elbLayer: 'elbLayer', scope: scopeB },
      { run: true },
    );

    // The layer name is the only thing the second source cannot have.
    expect(errorsAbout(second.logger, 'elbLayer')).toEqual([
      'elbLayer "elbLayer" is already adopted by another source',
    ]);
    expect(errorMessages(second.logger)).toHaveLength(1);

    // A page pushing into the named layer reaches the source that owns it, and
    // only that one: a queue is drained once.
    readLayer('elbLayer').push(['product view', { id: 'p1' }]);
    await flushChain();
    expect(named(flowA.events, 'product view')).toHaveLength(1);
    expect(named(flowB.events, 'product view')).toHaveLength(0);

    // The refusal costs the second source the layer, nothing else: its own
    // pipeline is live, which is what makes the assertion above a real zero.
    click(buttonB);
    await flushChain();
    expect(named(flowB.events, 'b go')).toHaveLength(1);
  });

  test('destroying one source leaves the other pulse, delegation and impression alive', async () => {
    jest.useFakeTimers();

    const flowA = await startRecordingFlow();
    const flowB = await startRecordingFlow();

    const pulseA = tagged('a', 'pulse(1000):tick');
    const buttonA = tagged('a', 'click:go');
    const bannerA = tagged('a', 'visible:seen');
    document.body.append(pulseA, buttonA, bannerA);

    const scopeB = document.createElement('div');
    scopeB.appendChild(tagged('b', 'pulse(1000):tick'));
    document.body.appendChild(scopeB);

    await bootSource(flowA, {}, { run: true });
    const second = await bootSource(
      flowB,
      { elb: 'elbB', elbLayer: 'layerB', scope: scopeB },
      { run: true },
    );

    // Positive control: every channel under test is live while both sources run.
    jest.advanceTimersByTime(1000);
    await flushChain();
    expect(named(flowA.events, 'a tick')).toHaveLength(1);
    expect(named(flowB.events, 'b tick')).toHaveLength(1);

    click(buttonA);
    await flushChain();
    expect(named(flowA.events, 'a go')).toHaveLength(1);

    fireVisible(bannerA, true);
    jest.advanceTimersByTime(1000);
    await flushChain();
    expect(named(flowA.events, 'a seen')).toHaveLength(1);

    // Leave the eligible band so the repeating trigger can arm again.
    fireVisible(bannerA, false);

    await destroyBrowserSource(second.source, flowB.collector);
    flowA.events.length = 0;
    flowB.events.length = 0;

    jest.advanceTimersByTime(1000);
    await flushChain();
    expect(named(flowA.events, 'a tick')).toHaveLength(1);
    expect(named(flowB.events, 'b tick')).toHaveLength(0);

    click(buttonA);
    await flushChain();
    expect(named(flowA.events, 'a go')).toHaveLength(1);

    fireVisible(bannerA, true);
    jest.advanceTimersByTime(1000);
    await flushChain();
    expect(named(flowA.events, 'a seen')).toHaveLength(1);
  });

  test('one tagged element in two overlapping scopes fires once into each pipeline', async () => {
    const flowA = await startRecordingFlow();
    const flowB = await startRecordingFlow();

    const shared = tagged('p', 'load:view;click:tap');
    document.body.appendChild(shared);

    await bootSource(flowA, {}, { run: true });

    // Positive control: the outer source scanned and fired the load trigger.
    expect(named(flowA.events, 'p view')).toHaveLength(1);

    await bootSource(
      flowB,
      { elb: 'elbB', elbLayer: 'layerB', scope: document.body },
      { run: true },
    );

    // The inner source wires the same element into its own pipeline: one set of
    // tags, two collectors, one event each.
    expect(named(flowB.events, 'p view')).toHaveLength(1);
    expect(named(flowA.events, 'p view')).toHaveLength(1);

    click(shared);
    await flushChain();
    expect(named(flowA.events, 'p tap')).toHaveLength(1);
    expect(named(flowB.events, 'p tap')).toHaveLength(1);
  });

  test('a second init keeps one live capture path instead of starting a second one', async () => {
    const flow = await startRecordingFlow();

    const button = tagged('p', 'click:view');
    document.body.appendChild(button);

    const instance = await bootSource(flow, {}, { run: true });

    // Positive control: both capture paths work after the first init.
    click(button);
    await callWriter('elb', 'product view', { id: 'first' });
    await flushChain();
    expect(named(flow.events, 'p view')).toHaveLength(1);
    expect(named(flow.events, 'product view')).toHaveLength(1);
    flow.events.length = 0;

    await instance.source.init?.();

    // One delegation, so one event per click. The writer is re-read from the
    // window, because a page calls whatever is installed there NOW: a second
    // init that installs a fresh, never-started controller holds the page's
    // events back for a run that already happened.
    click(button);
    await callWriter('elb', 'product view', { id: 'second' });
    await flushChain();
    expect(named(flow.events, 'p view')).toHaveLength(1);
    expect(named(flow.events, 'product view')).toHaveLength(1);
    expect(errorMessages(instance.logger)).toHaveLength(0);
  });

  test('a refused source reports the settings it was given', async () => {
    const flowA = await startRecordingFlow();
    const flowB = await startRecordingFlow();

    await bootSource(flowA, {}, { run: true });

    // Every field differs from the package defaults where it can, so reported
    // defaults are distinguishable from reported requests.
    const requested: Source.Settings<Types> = {
      prefix: 'data-track',
      scope: document,
      pageview: true,
      capture: false,
      elb: 'elb',
      elbLayer: 'elbLayer',
    };
    const second = await bootSource(flowB, requested, { run: true });

    // Refused on both page-global resources, and still honest about what it
    // was asked to do. The scope node is compared by identity and held out of
    // the object comparison: a mismatch there prints the whole document.
    expect(errorMessages(second.logger)).toHaveLength(2);
    const reported = second.source.config.settings;
    expect(reported?.scope).toBe(requested.scope);
    expect({ ...reported, scope: undefined }).toEqual({
      ...requested,
      scope: undefined,
    });
  });
});
