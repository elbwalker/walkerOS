import { startFlow } from '@walkeros/collector';
import {
  createBrowserSource,
  destroyBrowserSource,
  flushChain,
} from './test-utils';
import { isRegistered, getScopeState, destroyTriggers } from '../trigger';
import type { WalkerOS, Collector } from '@walkeros/core';

// End-to-end coverage for [data-elbobserve] through a REAL collector + source
// (not the trigger internals directly). Each scenario drives the source via
// createBrowserSource + on('run'), injects DOM into the observed container, and
// asserts events land on the collector's push. The registry/observer accessors
// are used for leak/observer-count assertions only — every action goes through
// the source. jsdom delivers MutationObserver records on a microtask, so each
// assertion after an append/remove drains via flushChain first; modern fake
// timers do not fake microtasks, so flushChain still settles the observer under
// jest.useFakeTimers() alongside jest.advanceTimersByTime.

const tagged = (action: string, entity = 'p'): HTMLDivElement => {
  const el = document.createElement('div');
  el.setAttribute('data-elb', entity);
  el.setAttribute('data-elbaction', action);
  return el;
};

describe('data-elbobserve integration (source + collector)', () => {
  let collector: Collector.Instance;
  let collectedEvents: WalkerOS.Event[];
  let mockPush: jest.MockedFunction<Collector.Instance['push']>;

  beforeEach(async () => {
    collectedEvents = [];
    document.body.innerHTML = '';
    // Clear any existing elbLayer. The global types Window.elbLayer as a
    // non-optional Layer, so deleteProperty is the cast-free reset (mirrors how
    // the source itself removes window.elb via Reflect.deleteProperty).
    Reflect.deleteProperty(window, 'elbLayer');

    mockPush = jest.fn().mockImplementation((...args: unknown[]) => {
      collectedEvents.push(args[0] as WalkerOS.Event);
      return Promise.resolve({ ok: true });
    }) as jest.MockedFunction<Collector.Instance['push']>;

    ({ collector } = await startFlow());
    collector.push = mockPush;
  });

  afterEach(() => {
    // Tear down every observer/interval this suite armed so nothing leaks into
    // the next test. Idempotent if a test already destroyed its source.
    destroyTriggers();
    document.body.innerHTML = '';
    Reflect.deleteProperty(window, 'elbLayer');
  });

  test('auto-registers content injected into an observed container exactly once, and a second injection adds one more (no double-fire)', async () => {
    document.body.innerHTML = `<div id="box" data-elbobserve></div>`;
    await createBrowserSource(
      collector,
      { pageview: false },
      { runOnInit: true },
    );
    mockPush.mockClear();

    const box = document.getElementById('box')!;

    const first = tagged('load:view');
    box.appendChild(first);
    await flushChain();

    // One insertion → exactly one event (the observer did not double-report).
    expect(mockPush).toHaveBeenCalledTimes(1);
    expect(collectedEvents[0]).toEqual(
      expect.objectContaining({ name: 'p view', trigger: 'load' }),
    );

    const second = tagged('load:view');
    box.appendChild(second);
    await flushChain();

    // A second same-shaped element adds exactly one more, not two.
    expect(mockPush).toHaveBeenCalledTimes(2);
  });

  test('a removed pulse element is reaped: it stops firing (no phantom events) and leaves no registry leak', async () => {
    jest.useFakeTimers();
    try {
      document.body.innerHTML = `<div id="box" data-elbobserve></div>`;
      await createBrowserSource(
        collector,
        { pageview: false },
        { runOnInit: true },
      );
      mockPush.mockClear();

      const box = document.getElementById('box')!;
      const pulse = tagged('pulse(1000):tick');
      box.appendChild(pulse);
      await flushChain(); // observer callback registers the pulse

      expect(isRegistered(pulse)).toBe(true);

      jest.advanceTimersByTime(1000);
      await flushChain();
      const firesWhileAttached = mockPush.mock.calls.length;
      expect(firesWhileAttached).toBeGreaterThan(0);

      box.removeChild(pulse);
      await flushChain(); // observer callback reaps the pulse

      // Reaped: gone from both the source-wide registry and its scope's set.
      expect(isRegistered(pulse)).toBe(false);
      expect(getScopeState(document)?.registered.has(pulse)).toBe(false);

      // No phantom fire on the detached node after advancing well past the period.
      jest.advanceTimersByTime(5000);
      await flushChain();
      expect(mockPush.mock.calls.length).toBe(firesWhileAttached);
    } finally {
      jest.useRealTimers();
    }
  });

  test('a nested observe container is skipped: one deep insertion yields one observer and one event', async () => {
    document.body.innerHTML = `
      <div id="outer" data-elbobserve>
        <div id="inner" data-elbobserve></div>
      </div>
    `;
    await createBrowserSource(
      collector,
      { pageview: false },
      { runOnInit: true },
    );
    mockPush.mockClear();

    // Observer COUNT is the load-bearing proof: source-wide dedup makes a stray
    // second observer's re-registration a no-op, so only the count (1, not 2)
    // distinguishes the nesting-skip from a double-observer regression.
    expect(getScopeState(document)?.mutationObservers).toHaveLength(1);

    const inner = document.getElementById('inner')!;
    inner.appendChild(tagged('load:view'));
    await flushChain();

    expect(mockPush).toHaveBeenCalledTimes(1);
  });

  test('destroy disconnects the observers, so a later injection produces no events', async () => {
    document.body.innerHTML = `<div id="box" data-elbobserve></div>`;
    const source = await createBrowserSource(
      collector,
      { pageview: false },
      { runOnInit: true },
    );

    const observers = getScopeState(document)?.mutationObservers ?? [];
    expect(observers).toHaveLength(1);
    const disconnectSpy = jest.spyOn(observers[0]!, 'disconnect');

    await destroyBrowserSource(source, collector);
    expect(disconnectSpy).toHaveBeenCalled();

    mockPush.mockClear();
    const box = document.getElementById('box')!;
    box.appendChild(tagged('load:view'));
    await flushChain();

    expect(mockPush).not.toHaveBeenCalled();
  });
});
