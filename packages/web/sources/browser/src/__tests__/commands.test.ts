import { startFlow } from '@walkeros/collector';
import {
  createBrowserSource,
  destroyBrowserSource,
  flushChain,
} from './test-utils';
import { __readInstanceGuardForTests } from '../index';
import type { WalkerOS, Collector } from '@walkeros/core';
import type { BrowserPush } from '../types';

// Cast-free narrowing of the window global to the browser push signature.
const isBrowserPush = (value: unknown): value is BrowserPush =>
  typeof value === 'function';

const readWindowElb = (): BrowserPush => {
  const value = Reflect.get(window, 'elb');
  if (!isBrowserPush(value)) throw new Error('window.elb not installed');
  return value;
};

describe('walker init command', () => {
  let collector: Collector.Instance;
  let collectedEvents: WalkerOS.DeepPartialEvent[];
  let mockPush: jest.Mock<Promise<{ ok: true }>, [WalkerOS.DeepPartialEvent]>;

  beforeEach(async () => {
    collectedEvents = [];
    document.body.innerHTML = '';
    Reflect.deleteProperty(window, 'elbLayer');

    const pushImpl = jest.fn(async (event: WalkerOS.DeepPartialEvent) => {
      collectedEvents.push(event);
      return { ok: true } as const;
    });
    mockPush = pushImpl;

    ({ collector } = await startFlow());
    collector.push = pushImpl;
  });

  afterEach(() => {
    document.body.innerHTML = '';
    Reflect.deleteProperty(window, 'elbLayer');
  });

  test('walker init with single element scope fires load triggers on tagged children', async () => {
    const { elb } = await createBrowserSource(collector, { pageview: false });
    mockPush.mockClear();

    const root = document.createElement('div');
    root.innerHTML =
      '<div data-elb="product" data-elbaction="load:view" data-elb-product="id:p1"></div>';
    document.body.appendChild(root);

    const result = await elb('walker init', root);

    expect(result).toEqual(expect.objectContaining({ ok: true }));
    expect(mockPush).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'product view',
        trigger: 'load',
        data: expect.objectContaining({ id: 'p1' }),
      }),
    );
  });

  test('walker init with array of scopes initializes each one', async () => {
    const { elb } = await createBrowserSource(collector, { pageview: false });
    mockPush.mockClear();

    const a = document.createElement('div');
    a.innerHTML =
      '<div data-elb="a" data-elbaction="load:view" data-elb-a="id:a1"></div>';
    const b = document.createElement('div');
    b.innerHTML =
      '<div data-elb="b" data-elbaction="load:view" data-elb-b="id:b1"></div>';
    document.body.appendChild(a);
    document.body.appendChild(b);

    await elb('walker init', [a, b]);

    const names = collectedEvents.map((e) => e.name).sort();
    expect(names).toEqual(['a view', 'b view']);
  });

  test('walker init with empty array returns ok and emits no events', async () => {
    const { elb } = await createBrowserSource(collector, { pageview: false });
    mockPush.mockClear();

    const result = await elb('walker init', []);

    expect(result).toEqual(expect.objectContaining({ ok: true }));
    expect(mockPush).not.toHaveBeenCalled();
  });

  test('walker init with no argument defaults to document scope', async () => {
    const { elb } = await createBrowserSource(collector, { pageview: false });
    mockPush.mockClear();

    document.body.innerHTML =
      '<div data-elb="page" data-elbaction="load:view"></div>';

    await elb('walker init');

    expect(mockPush).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'page view', trigger: 'load' }),
    );
  });

  test('walker init on element without walker-tagged children emits no events', async () => {
    const { elb } = await createBrowserSource(collector, { pageview: false });
    mockPush.mockClear();

    const empty = document.createElement('div');
    empty.innerHTML = '<p>nothing tagged</p>';
    document.body.appendChild(empty);

    const result = await elb('walker init', empty);

    expect(result).toEqual(expect.objectContaining({ ok: true }));
    expect(mockPush).not.toHaveBeenCalled();
  });

  test('walker init after dynamic DOM injection fires load on newly tagged elements', async () => {
    const { elb } = await createBrowserSource(collector, { pageview: false });
    mockPush.mockClear();

    const host = document.createElement('div');
    document.body.appendChild(host);

    expect(mockPush).not.toHaveBeenCalled();

    host.innerHTML =
      '<div data-elb="product" data-elbaction="load:view" data-elb-product="id:dyn1"></div>';

    await elb('walker init', host);

    expect(mockPush).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'product view',
        trigger: 'load',
        data: expect.objectContaining({ id: 'dyn1' }),
      }),
    );
  });

  test('walker init called twice re-fires load triggers (no internal dedupe)', async () => {
    const { elb } = await createBrowserSource(collector, { pageview: false });
    mockPush.mockClear();

    const root = document.createElement('div');
    root.innerHTML =
      '<div data-elb="product" data-elbaction="load:view" data-elb-product="id:p1"></div>';
    document.body.appendChild(root);

    await elb('walker init', root);
    await elb('walker init', root);

    const productViews = collectedEvents.filter(
      (e) => e.name === 'product view',
    );
    expect(productViews).toHaveLength(2);
  });
});

describe('walker destination command', () => {
  let collector: Collector.Instance;
  let collectedEvents: WalkerOS.DeepPartialEvent[];
  let mockPush: jest.Mock<Promise<{ ok: true }>, [WalkerOS.DeepPartialEvent]>;

  beforeEach(async () => {
    collectedEvents = [];
    document.body.innerHTML = '';
    Reflect.deleteProperty(window, 'elbLayer');

    const pushImpl = jest.fn(async (event: WalkerOS.DeepPartialEvent) => {
      collectedEvents.push(event);
      return { ok: true } as const;
    });
    mockPush = pushImpl;

    ({ collector } = await startFlow());
    collector.push = pushImpl;
  });

  afterEach(() => {
    document.body.innerHTML = '';
    Reflect.deleteProperty(window, 'elbLayer');
  });

  test('walker destination registers a destination and the destination is added to collector.destinations', async () => {
    const { elb } = await createBrowserSource(collector, { pageview: false });

    const destinationPushes: WalkerOS.DeepPartialEvent[] = [];

    await elb('walker destination', {
      code: {
        type: 'test',
        push: async (event: WalkerOS.DeepPartialEvent) => {
          destinationPushes.push(event);
        },
      },
      config: { id: 'test-dest' },
    });

    expect(collector.destinations['test-dest']).toBeDefined();
  });
});

describe('walker hook command', () => {
  let collector: Collector.Instance;
  let collectedEvents: WalkerOS.DeepPartialEvent[];
  let mockPush: jest.Mock<Promise<{ ok: true }>, [WalkerOS.DeepPartialEvent]>;

  beforeEach(async () => {
    collectedEvents = [];
    document.body.innerHTML = '';
    Reflect.deleteProperty(window, 'elbLayer');

    const pushImpl = jest.fn(async (event: WalkerOS.DeepPartialEvent) => {
      collectedEvents.push(event);
      return { ok: true } as const;
    });
    mockPush = pushImpl;

    ({ collector } = await startFlow());
    collector.push = pushImpl;
  });

  afterEach(() => {
    document.body.innerHTML = '';
    Reflect.deleteProperty(window, 'elbLayer');
  });

  test('walker hook registers a hook on collector.hooks', async () => {
    const { elb } = await createBrowserSource(collector, { pageview: false });

    const hookFn = jest.fn();

    await elb('walker hook', { name: 'prePush', fn: hookFn });

    expect(collector.hooks.prePush).toBeDefined();
  });
});

describe('window.elb installed by the source', () => {
  let collector: Collector.Instance;
  let mockPush: jest.Mock<Promise<{ ok: true }>, [WalkerOS.DeepPartialEvent]>;

  beforeEach(async () => {
    document.body.innerHTML = '';
    Reflect.deleteProperty(window, 'elbLayer');
    Reflect.deleteProperty(window, 'elb');

    const pushImpl = jest.fn(async (event: WalkerOS.DeepPartialEvent) => {
      return { ok: true } as const;
    });
    mockPush = pushImpl;

    ({ collector } = await startFlow());
    collector.push = pushImpl;
  });

  afterEach(() => {
    document.body.innerHTML = '';
    Reflect.deleteProperty(window, 'elbLayer');
    Reflect.deleteProperty(window, 'elb');
  });

  test('window.elb handles walker init: resolves ok and attaches load triggers', async () => {
    await createBrowserSource(collector, { pageview: false });
    mockPush.mockClear();

    const root = document.createElement('div');
    root.innerHTML =
      '<div data-elb="product" data-elbaction="load:view" data-elb-product="id:p1"></div>';
    document.body.appendChild(root);

    // Same funnel as window.elbLayer: appends to the layer and routes. Walker
    // commands run immediately (pre-start command lane), so `walker init`
    // reaches initScope without a `run` being driven.
    const result = await readWindowElb()('walker init', root);
    await flushChain();

    expect(result).toEqual(expect.objectContaining({ ok: true }));
    expect(mockPush).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'product view',
        trigger: 'load',
        data: expect.objectContaining({ id: 'p1' }),
      }),
    );
  });

  test('elbLayer:false — window.elb routes directly and run fires the pageview', async () => {
    // No controller is built. window.elb falls back to the source push (direct
    // route) and run fires the pageview via the no-controller branch.
    const source = await createBrowserSource(collector, {
      elbLayer: false,
      elb: 'elb',
      pageview: true,
    });

    // No layer adopted when elbLayer is disabled.
    expect(Reflect.get(window, 'elbLayer')).toBeUndefined();

    mockPush.mockClear();
    await readWindowElb()('product view', { id: 'p9' });
    await flushChain();

    expect(mockPush).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'product view',
        data: expect.objectContaining({ id: 'p9' }),
      }),
    );

    mockPush.mockClear();
    await source.on?.('run', collector);
    await flushChain();

    expect(mockPush).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'page view', trigger: 'load' }),
    );
  });
});

describe('browser source destroy contract', () => {
  let collector: Collector.Instance;
  let mockPush: jest.Mock<Promise<{ ok: true }>, [WalkerOS.DeepPartialEvent]>;

  beforeEach(async () => {
    document.body.innerHTML = '';
    Reflect.deleteProperty(window, 'elbLayer');
    Reflect.deleteProperty(window, 'elb');

    const pushImpl = jest.fn(async (event: WalkerOS.DeepPartialEvent) => {
      return { ok: true } as const;
    });
    mockPush = pushImpl;

    ({ collector } = await startFlow());
    collector.push = pushImpl;
  });

  afterEach(() => {
    document.body.innerHTML = '';
    Reflect.deleteProperty(window, 'elbLayer');
    Reflect.deleteProperty(window, 'elb');
  });

  test('destroy removes window.elb, silences layer routing, and clears the guard', async () => {
    const source = await createBrowserSource(collector, { pageview: false });
    expect(isBrowserPush(Reflect.get(window, 'elb'))).toBe(true);

    await destroyBrowserSource(source, collector);

    // The function we installed is gone, and the single-instance sentinel is
    // cleared so a fresh boot on this window is not treated as inert.
    expect(Reflect.get(window, 'elb')).toBeUndefined();
    expect(__readInstanceGuardForTests()).toBeUndefined();

    // Native push restored: pushes append silently, nothing routes.
    mockPush.mockClear();
    const layer = Reflect.get(window, 'elbLayer');
    if (!Array.isArray(layer)) throw new Error('elbLayer missing');
    const before = layer.length;
    layer.push(['product view', { id: 'X' }]);
    await flushChain();

    expect(layer.length).toBe(before + 1);
    expect(mockPush).not.toHaveBeenCalled();

    // A second boot succeeds and reinstalls a working window.elb.
    const second = await createBrowserSource(collector, { pageview: false });
    expect(second).toBeDefined();
    expect(isBrowserPush(Reflect.get(window, 'elb'))).toBe(true);
  });
});
