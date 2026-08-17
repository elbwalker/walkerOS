import type { Elb } from '@walkeros/core';
import { isObject } from '@walkeros/core';
import type { Context, Registry, Settings } from '../types';
import {
  createRegistry,
  initGlobalTrigger,
  initScopeTrigger,
  ready,
  Triggers,
  handleTrigger,
  destroyTriggers,
} from '../trigger';
import { destroyVisibilityTracking } from '../triggerVisible';

// Narrows a listener's options argument to the abort-signal shape, so a test
// can tell an armed registration from a cancelled one without a cast.
const isSignalOption = (value: unknown): value is { signal: AbortSignal } =>
  isObject(value) && value.signal instanceof AbortSignal;

// Helper function to create test settings
const createTestSettings = (prefix = 'data-elb'): Settings => ({
  prefix,
  scope: document,
  pageview: false,
  capture: true,
  elb: false,
  elbLayer: false,
});

// Mock the dependencies
jest.mock('@walkeros/core', () => ({
  ...jest.requireActual('@walkeros/core'),
  tryCatch: (fn: () => void) => fn, // Simplified mock
}));

jest.mock('@walkeros/collector', () => ({
  Const: {
    Commands: {
      Action: 'action',
      Context: 'context',
      Link: 'link',
      Prefix: 'data-elb',
      Scoped: '_',
    },
  },
  onApply: jest.fn(),
}));

describe('Trigger System', () => {
  let mockElb: jest.MockedFunction<Elb.Fn>;
  let mockAddEventListener: jest.Mock;
  let events: Record<string, EventListenerOrEventListenerObject> = {};
  let registry: Registry;
  let context: Context;

  // File-local context builder. One registry per test, so a test starts with
  // no listeners, timers or observers from any earlier one.
  const makeContext = (prefix = 'data-elb'): Context => ({
    elb: mockElb,
    settings: createTestSettings(prefix),
    registry,
  });

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock elb function
    mockElb = jest.fn().mockResolvedValue({
      ok: true,
    });

    // Mock event listeners
    events = {};
    mockAddEventListener = jest.fn().mockImplementation((event, callback) => {
      events[event] = callback;
    });
    document.addEventListener = mockAddEventListener;

    // Mock DOM ready state
    Object.defineProperty(document, 'readyState', {
      value: 'complete',
      writable: true,
    });

    registry = createRegistry();
    context = makeContext();
  });

  afterEach(() => {
    // Releases this test's listeners, timers and observers. Idempotent when a
    // test already tore its context down.
    destroyTriggers(context);
    document.body.innerHTML = '';
  });

  test('ready function executes immediately when document is ready', async () => {
    const mockFn = jest.fn();
    const settings = createTestSettings();

    await ready(mockFn, context, settings);

    expect(mockFn).toHaveBeenCalledWith(context, settings);
  });

  test('ready defers to DOMContentLoaded and a destroy before it cancels the deferred init', async () => {
    Object.defineProperty(document, 'readyState', {
      value: 'loading',
      writable: true,
    });

    const parked: EventListener[] = [];
    let parkedSignal: AbortSignal | undefined;
    document.addEventListener = jest
      .fn()
      .mockImplementation(
        (
          event: string,
          handler: EventListener,
          options?: AddEventListenerOptions,
        ) => {
          if (event !== 'DOMContentLoaded') return;
          parked.push(handler);
          parkedSignal = options?.signal;
        },
      );

    const mockFn = jest.fn();
    const settings = createTestSettings();
    await ready(mockFn, context, settings);

    // Parked, and parked on a signal, so teardown removes it.
    expect(parked).toHaveLength(1);
    expect(parkedSignal).toBeDefined();
    expect(mockFn).not.toHaveBeenCalled();

    // A source torn down before the DOM is ready binds nothing afterwards,
    // even if the hook still runs.
    destroyTriggers(context);
    expect(parkedSignal?.aborted).toBe(true);
    parked[0]!(new Event('DOMContentLoaded'));

    expect(mockFn).not.toHaveBeenCalled();
  });

  test('handleTrigger processes events correctly', async () => {
    document.body.innerHTML =
      '<div id="test" data-elb="entity" data-elb-entity="key:value" data-elbaction="click:action"></div>';

    const element = document.getElementById('test')!;

    const testSettings = {
      prefix: 'data-elb',
      scope: document,
      pageview: false,
      elb: false,
      elbLayer: false,
    } as Settings;

    await handleTrigger(
      { elb: mockElb, settings: testSettings, registry },
      element,
      Triggers.Click,
    );

    expect(mockElb).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'entity action',
        entity: 'entity',
        action: 'action',
        trigger: Triggers.Click,
      }),
    );
  });

  test('scroll listener for a ShadowRoot scope attaches to the document, not the shadow root', () => {
    const host = document.createElement('div');
    document.body.appendChild(host);
    const root = host.attachShadow({ mode: 'open' });
    root.innerHTML = `<div data-elb="content" data-elbaction="scroll:50">Content</div>`;

    // A ShadowRoot never receives page scroll events, so a listener on it would
    // never fire. The fix must route it to the owner document instead.
    const rootAddEventListener = jest.spyOn(root, 'addEventListener');

    initScopeTrigger({
      ...context,
      settings: { ...context.settings, scope: root },
    });

    // The document (mocked addEventListener) received the scroll listener...
    expect(events.scroll).toBeDefined();
    // ...and the shadow root did not.
    expect(rootAddEventListener).not.toHaveBeenCalledWith(
      'scroll',
      expect.anything(),
      expect.anything(),
    );
  });

  describe('Trigger Parameters', () => {
    beforeEach(() => {
      jest.useFakeTimers();
      jest.spyOn(global, 'setTimeout');
      jest.spyOn(global, 'setInterval');
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    // One parameter matrix: both timer triggers parse their param the same way
    // and fall back to the same 15000ms default when it does not parse.
    it.each([
      ['pulse', 'pulse:action', 'setInterval', 15000],
      ['pulse', 'pulse(5000):action', 'setInterval', 5000],
      ['pulse', 'pulse(invalid):action', 'setInterval', 15000],
      ['wait', 'wait:action', 'setTimeout', 15000],
      ['wait', 'wait(3000):action', 'setTimeout', 3000],
      ['wait', 'wait(invalid):action', 'setTimeout', 15000],
    ] as const)(
      '%s %s schedules at %s %dms',
      (_trigger, action, timer, expected) => {
        document.body.innerHTML = `<div data-elb="content" data-elbaction="${action}">Content</div>`;

        initScopeTrigger(context);

        const scheduler = timer === 'setInterval' ? setInterval : setTimeout;
        expect(scheduler).toHaveBeenCalledWith(expect.any(Function), expected);
      },
    );

    test('pulse trigger only fires when document is visible', () => {
      document.body.innerHTML = `
        <div id="pulse-elem" data-elb="content" data-elbaction="pulse(1000):action">Content</div>
      `;

      initScopeTrigger(context);

      // Get the interval callback
      const intervalCallback = (setInterval as jest.Mock).mock.calls[0][0];

      // Test when document is hidden
      Object.defineProperty(document, 'hidden', {
        value: true,
        writable: true,
      });

      intervalCallback();
      expect(mockElb).not.toHaveBeenCalled();

      // Test when document is visible
      Object.defineProperty(document, 'hidden', {
        value: false,
        writable: true,
      });

      intervalCallback();
      expect(mockElb).toHaveBeenCalled();
    });

    test('wait trigger executes callback after delay', () => {
      document.body.innerHTML = `
        <div id="wait-elem" data-elb="content" data-elbaction="wait(1000):action">Content</div>
      `;

      initScopeTrigger(context);

      // Should not have triggered yet
      expect(mockElb).not.toHaveBeenCalled();

      // Fast-forward time
      jest.advanceTimersByTime(1000);

      // Should have triggered after delay
      expect(mockElb).toHaveBeenCalled();
    });

    test('load trigger executes immediately', () => {
      document.body.innerHTML = `
        <div id="load-elem" data-elb="content" data-elbaction="load:action">Content</div>
      `;

      initScopeTrigger(context);

      // Load trigger should execute immediately
      expect(mockElb).toHaveBeenCalled();
    });

    // A cleared timer that still fires is the only failure that matters, so
    // each cleanup test asserts the timer was scheduled (positive control) and
    // then that nothing fires after teardown.
    describe('Timer cleanup', () => {
      test('pulse does not fire after destroyTriggers', () => {
        document.body.innerHTML = `
          <div id="pulse-elem" data-elb="content" data-elbaction="pulse(1000):action">Content</div>
        `;

        initScopeTrigger(context);
        expect(setInterval).toHaveBeenCalledWith(expect.any(Function), 1000);
        mockElb.mockClear();

        destroyTriggers(context);
        jest.advanceTimersByTime(5000);

        expect(mockElb).not.toHaveBeenCalled();
      });

      test('wait does not fire after destroyTriggers', () => {
        document.body.innerHTML = `
          <div id="wait-elem" data-elb="content" data-elbaction="wait(1000):action">Content</div>
        `;

        initScopeTrigger(context);
        expect(setTimeout).toHaveBeenCalledWith(expect.any(Function), 1000);
        mockElb.mockClear();

        destroyTriggers(context);
        jest.advanceTimersByTime(5000);

        expect(mockElb).not.toHaveBeenCalled();
      });

      test('the scroll listener is detached by destroyTriggers', () => {
        document.body.innerHTML = `
          <div id="scroll-elem" data-elb="content" data-elbaction="scroll(50):action">Content</div>
        `;

        initScopeTrigger(context);

        const registration = mockAddEventListener.mock.calls.find(
          (call) => call[0] === 'scroll',
        );
        const options: unknown = registration?.[2];
        if (!isSignalOption(options))
          throw new Error('scroll listener unarmed');
        // Positive control: armed while the scope is live.
        expect(options.signal.aborted).toBe(false);

        destroyTriggers(context);

        // A listener that survives teardown keeps a dead scope's bucket alive
        // and accrues one more on every start/stop cycle.
        expect(options.signal.aborted).toBe(true);
      });

      test('a re-init leaves exactly one live scroll listener', () => {
        document.body.innerHTML = `
          <div id="scroll-elem" data-elb="content" data-elbaction="scroll(50):action">Content</div>
        `;

        initScopeTrigger(context);
        initScopeTrigger(context);

        // Each init registers a listener; the re-init aborts the signal the
        // previous one was given, so only the newest is still armed. Without
        // that signal every `walker run` would accrue a dead listener.
        const registrations = mockAddEventListener.mock.calls.filter(
          (call) => call[0] === 'scroll',
        );
        const live = registrations.filter((call) => {
          const options: unknown = call[2];
          return isSignalOption(options) && !options.signal.aborted;
        });

        expect(registrations).toHaveLength(2);
        expect(live).toHaveLength(1);
      });
    });
  });

  describe('Custom Prefix Support', () => {
    test('load trigger works with custom prefix', () => {
      // Set up DOM with custom prefix
      document.body.innerHTML = `
        <div data-custom="entity" data-customaction="load">Test Content</div>
      `;

      // Initialize scope triggers with custom prefix
      initScopeTrigger(makeContext('data-custom'));

      // Should have called push with entity load event
      expect(mockElb).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'entity load',
          trigger: 'load',
        }),
      );
    });
  });

  describe('Trigger cleanup', () => {
    test('destroyTriggers removes hover listeners added to individual elements', () => {
      document.body.innerHTML = `
        <div id="hover-elem" data-elb="content" data-elbaction="hover:action">Content</div>
      `;
      const element = document.getElementById('hover-elem')!;

      // Hover listeners are per element, carried by the element's own
      // registration signal, so the scan alone arms them.
      initScopeTrigger(context);
      destroyTriggers(context);

      element.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }));

      expect(mockElb).not.toHaveBeenCalledWith(
        expect.objectContaining({ trigger: Triggers.Hover }),
      );
    });

    test('calling destroyTriggers before initTriggers does not throw', () => {
      expect(() => destroyTriggers(context)).not.toThrow();
    });
  });

  describe('Re-init clears scope state', () => {
    // Re-running `walker init` / `walker run` on the same scope must equal one
    // fresh init: prior pulse/wait/hover state is torn down, then attached
    // fresh. `load` is the deliberate exception (immediate, re-fires per init).
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    const triggerOf = (call: unknown[]): unknown =>
      isObject(call[0]) ? call[0].trigger : undefined;
    const countTrigger = (trigger: string): number =>
      mockElb.mock.calls.filter((call) => triggerOf(call) === trigger).length;

    test('1a pulse: double init fires once per tick (no stacking)', () => {
      document.body.innerHTML = `
        <div data-elb="content" data-elbaction="pulse(1000):action">Content</div>
      `;
      Object.defineProperty(document, 'hidden', {
        value: false,
        writable: true,
      });

      const settings = createTestSettings('data-elb');

      initScopeTrigger(context);
      initScopeTrigger(context);

      jest.advanceTimersByTime(1000);

      // A second init must not stack a second interval on the element.
      expect(countTrigger('pulse')).toBe(1);
    });

    test('1b wait: double init fires once', () => {
      document.body.innerHTML = `
        <div data-elb="content" data-elbaction="wait(1000):action">Content</div>
      `;

      const settings = createTestSettings('data-elb');

      initScopeTrigger(context);
      initScopeTrigger(context);

      jest.advanceTimersByTime(1000);

      // A second init must not stack a second timeout on the element.
      expect(countTrigger('wait')).toBe(1);
    });

    test('1c hover: double init fires once per mouseenter', () => {
      document.body.innerHTML = `
        <div id="hover-elem" data-elb="content" data-elbaction="hover:action">Content</div>
      `;
      const element = document.getElementById('hover-elem')!;

      const settings = createTestSettings('data-elb');

      initScopeTrigger(context);
      initScopeTrigger(context);

      element.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }));

      // A second init must not stack a second listener on the element.
      expect(countTrigger('hover')).toBe(1);
    });

    test('1d load: double init fires twice (intended, not deduped)', () => {
      document.body.innerHTML = `
        <div data-elb="content" data-elbaction="load:action">Content</div>
      `;

      const settings = createTestSettings('data-elb');

      initScopeTrigger(context);
      initScopeTrigger(context);

      // load is immediate and re-fires per init, by design.
      expect(countTrigger('load')).toBe(2);
    });

    test('1f sub-scope re-init does not abort root click/submit', () => {
      // The root click/submit controller is instance-level; a sub-scope
      // re-init must only abort its own per-scope controller. If the fix
      // wrongly tore down the root controller, page-wide click/submit would
      // silently die.
      const rootScope = document.createElement('div');
      rootScope.innerHTML = `<button data-elb="cta" data-elbaction="click:press">Go</button>`;
      document.body.appendChild(rootScope);
      const rootSettings: Settings = {
        ...createTestSettings('data-elb'),
        scope: rootScope,
      };
      const rootContext: Context = {
        elb: mockElb,
        settings: rootSettings,
        registry,
      };
      initGlobalTrigger(rootContext);

      const container = document.createElement('div');
      document.body.appendChild(container);
      const containerSettings: Settings = {
        ...createTestSettings('data-elb'),
        scope: container,
      };
      const containerContext: Context = {
        elb: mockElb,
        settings: containerSettings,
        registry,
      };
      initScopeTrigger(containerContext);

      rootScope
        .querySelector('button')!
        .dispatchEvent(new MouseEvent('click', { bubbles: true }));

      // The root click listener survives a sub-scope init.
      expect(countTrigger('click')).toBe(1);
    });
  });

  describe('Scoped re-init (walker init <element>)', () => {
    // Scope is a single carrier: it lives in context.settings.scope. The
    // translation layer builds a scope-aligned context for `walker init <el>`,
    // so every observer create/lookup reads the same scope, which the
    // visibility layer normalizes to its owner document. One source therefore
    // holds one observer per document. Each created observer is captured so we
    // can assert WHICH one an element lands on (and whether it is still live).
    let observers: MockIntersectionObserver[];
    let originalIntersectionObserver: typeof IntersectionObserver;

    // Cast-free IntersectionObserver stub: a class that implements the
    // interface, so it is assignable to `typeof IntersectionObserver` without
    // casts and exposes jest mocks for assertions.
    class MockIntersectionObserver implements IntersectionObserver {
      root: Document | Element | null = null;
      rootMargin = '0px';
      thresholds: ReadonlyArray<number> = [0, 0.5];
      observe = jest.fn();
      unobserve = jest.fn();
      disconnect = jest.fn();
      takeRecords = jest.fn(() => []);

      constructor(_callback?: IntersectionObserverCallback) {
        observers.push(this);
      }
    }

    const observedOn = (el: Element) =>
      observers.filter((o) =>
        o.observe.mock.calls.some((args) => args[0] === el),
      ).length;
    // Counts only observers that are still live (not disconnected) and have
    // observed the element. Re-init must leave the element on exactly one live
    // observer, never stack it across several.
    const liveObservedOn = (el: Element) =>
      observers.filter(
        (o) =>
          o.disconnect.mock.calls.length === 0 &&
          o.observe.mock.calls.some((args) => args[0] === el),
      ).length;

    beforeEach(() => {
      observers = [];
      originalIntersectionObserver = global.IntersectionObserver;
      global.IntersectionObserver = MockIntersectionObserver;
    });

    afterEach(() => {
      global.IntersectionObserver = originalIntersectionObserver;
    });

    test('a sub-scoped init registers visible elements in the scope on the observer of this source', () => {
      document.body.innerHTML = `
        <section id="injected">
          <div id="promo" data-elb="promo" data-elbaction="visible:view(promo)"></div>
        </section>
      `;
      const settings = createTestSettings('data-elb'); // source context: scope = document
      const container = document.getElementById('injected')!;
      const promo = document.getElementById('promo')!;

      // `walker init <container>`: the translation layer builds a scope-aligned
      // context whose settings.scope is the container. The sub-scope init scans
      // the container, finds its visible element, and observes it on this
      // source's observer for the container's owner document.
      initScopeTrigger({
        ...context,
        settings: { ...context.settings, scope: container },
      });

      // This source's per-document observer is created, and the container's own
      // visible element is registered on it exactly once.
      expect(observers.length).toBeGreaterThan(0);
      expect(observedOn(promo)).toBe(1);

      destroyVisibilityTracking(registry, document);
      destroyVisibilityTracking(registry, container);
    });

    test('2b a document-scope run observes its visible elements', () => {
      document.body.innerHTML = `
        <div id="promo" data-elb="promo" data-elbaction="visible:view(promo)"></div>
      `;
      const settings = createTestSettings('data-elb'); // scope = document
      const promo = document.getElementById('promo')!;

      initScopeTrigger(context);

      // `walker run` aligns scope on both sides, so the element is observed.
      expect(observedOn(promo)).toBe(1);

      destroyVisibilityTracking(registry, document);
    });

    test('2c double scoped re-init keeps the element on a single live observer', () => {
      document.body.innerHTML = `
        <section id="injected">
          <div id="promo" data-elb="promo" data-elbaction="visible:view(promo)"></div>
        </section>
      `;
      const container = document.getElementById('injected')!;
      const promo = document.getElementById('promo')!;
      const settings: Settings = {
        ...createTestSettings('data-elb'),
        scope: container,
      };
      // Scope-aligned context, as the translation layer builds for walker init.
      const context: Context = { elb: mockElb, settings, registry };

      initScopeTrigger(context);
      initScopeTrigger(context);

      // No stacking: the prior registration is torn down, the element ends up
      // on exactly one live observer.
      expect(liveObservedOn(promo)).toBe(1);

      destroyVisibilityTracking(registry, container);
      destroyVisibilityTracking(registry, document);
    });
  });

  describe('Scroll geometry (viewport-relative, shadow DOM)', () => {
    // jsdom returns all-zero rects, so geometry is driven by mocking
    // getBoundingClientRect. Only top/height/bottom carry the values under test.
    const makeRect = (top: number, height: number): DOMRect => ({
      top,
      bottom: top + height,
      left: 0,
      right: 0,
      width: 0,
      height,
      x: 0,
      y: top,
      toJSON: () => ({}),
    });

    const firedScroll = (entity: string): boolean =>
      mockElb.mock.calls.some(
        (call) =>
          isObject(call[0]) &&
          call[0].trigger === Triggers.Scroll &&
          call[0].entity === entity,
      );

    const runScrollListener = (): void => {
      const listener = events.scroll;
      if (typeof listener !== 'function')
        throw new Error('scroll listener was not registered');
      listener(new Event('scroll'));
    };

    // Depth semantics, driven through the real scroll listener. Viewport is
    // 500px and every element is 200px tall, so
    //   depth = (1 - ((rect.top + 200) - 500) / 200) * 100
    // puts rect.top 440 at depth 30 and rect.top 380 at depth 60.
    const placeScrollElement = (action: string, rectTop: number): void => {
      Object.defineProperty(window, 'innerHeight', {
        value: 500,
        writable: true,
      });
      document.body.innerHTML = `<div id="target" data-elb="box" data-elbaction="${action}">Box</div>`;
      const el = document.getElementById('target')!;
      Object.defineProperty(el, 'clientHeight', { value: 200 });
      el.getBoundingClientRect = () => makeRect(rectTop, 200);
    };

    it.each([
      ['no parameter defaults to 50', 'scroll:seen', 440, false],
      ['no parameter defaults to 50', 'scroll:seen', 380, true],
      [
        'an explicit 25 fires earlier than the default',
        'scroll(25):seen',
        440,
        true,
      ],
      [
        'an explicit 75 fires later than the default',
        'scroll(75):seen',
        380,
        false,
      ],
      [
        'an unparseable parameter falls back to 50',
        'scroll(invalid):seen',
        440,
        false,
      ],
      [
        'an unparseable parameter falls back to 50',
        'scroll(invalid):seen',
        380,
        true,
      ],
    ] as const)(
      '%s: %s at rect top %d fires %s',
      (_label, action, rectTop, expected) => {
        placeScrollElement(action, rectTop);

        initScopeTrigger(context);
        runScrollListener();

        expect(firedScroll('box')).toBe(expected);
      },
    );

    it.each(['scroll(-10):seen', 'scroll(150):seen'])(
      'an out-of-range depth registers no scroll trigger: %s',
      (action) => {
        // Out of range is rejected outright, not clamped: the element is the
        // page's only scroll action, so no scroll listener is registered at all.
        placeScrollElement(action, 380);

        initScopeTrigger(context);

        expect(events.scroll).toBeUndefined();
      },
    );

    test('light-DOM and open-shadow elements at the same visual position fire identically', () => {
      // Same visual position: rect.top 380 in a 500px viewport, height 300 ->
      // computed depth 40%. With a 50% threshold neither element should fire.
      // The shadow element's offsetTop is offsetParent-relative (30, wrong); its
      // viewport rect is the true position (380). Sourcing geometry from the rect
      // makes the shadow element behave exactly like its light-DOM twin.
      Object.defineProperty(window, 'innerHeight', {
        value: 500,
        writable: true,
      });
      Object.defineProperty(window, 'scrollY', { value: 0, writable: true });

      document.body.innerHTML = `
        <div style="height: 1000px;">
          <div id="light" data-elb="lightbox" data-elbaction="scroll(50):seen">Light</div>
        </div>
        <div id="host"></div>
      `;

      const light = document.getElementById('light')!;
      Object.defineProperty(light, 'offsetTop', { value: 380 });
      Object.defineProperty(light, 'clientHeight', { value: 300 });
      light.getBoundingClientRect = () => makeRect(380, 300);

      const host = document.getElementById('host')!;
      const shadow = host.attachShadow({ mode: 'open' });
      const shadowEl = document.createElement('div');
      shadowEl.setAttribute('data-elb', 'shadowbox');
      shadowEl.setAttribute('data-elbaction', 'scroll(50):seen');
      shadow.appendChild(shadowEl);
      // offsetParent-relative, understates the true page position.
      Object.defineProperty(shadowEl, 'offsetTop', { value: 30 });
      Object.defineProperty(shadowEl, 'clientHeight', { value: 300 });
      // Viewport-relative rect matches the light twin exactly.
      shadowEl.getBoundingClientRect = () => makeRect(380, 300);

      initScopeTrigger(context);
      runScrollListener();

      // Baseline: the light-DOM element is below the 50% threshold (40%).
      expect(firedScroll('lightbox')).toBe(false);
      // Equal depth at the same visual position: the shadow twin must match the
      // light twin. offsetTop geometry diverges (fires at ~157%); rects do not.
      expect(firedScroll('shadowbox')).toBe(firedScroll('lightbox'));
    });

    test('scroll depth uses the 1 - hidden/elemHeight metric (viewport coordinates)', () => {
      // Element taller than the viewport, top scrolled above the fold:
      // rect.top -100, height 1000, viewport 500 ->
      //   hidden = (rect.top + height) - innerHeight = 400
      //   depth  = (1 - hidden/height) * 100 = 60
      // A "percent visible in viewport" metric would instead read 50 (500/1000),
      // so a 60% threshold fires only under the intended metric, a 61% one never.
      Object.defineProperty(window, 'innerHeight', {
        value: 500,
        writable: true,
      });
      // scrollY only feeds the pre-fix offsetTop path; keep old and new aligned.
      Object.defineProperty(window, 'scrollY', { value: 600, writable: true });

      document.body.innerHTML = `
        <div id="pinlow" data-elb="pinlow" data-elbaction="scroll(60):seen">Low</div>
        <div id="pinhigh" data-elb="pinhigh" data-elbaction="scroll(61):seen">High</div>
      `;

      for (const id of ['pinlow', 'pinhigh']) {
        const el = document.getElementById(id)!;
        Object.defineProperty(el, 'offsetTop', { value: 500 });
        Object.defineProperty(el, 'clientHeight', { value: 1000 });
        el.getBoundingClientRect = () => makeRect(-100, 1000);
      }

      initScopeTrigger(context);
      runScrollListener();

      // depth 60 >= 60 threshold -> fires; 60 < 61 threshold -> does not.
      expect(firedScroll('pinlow')).toBe(true);
      expect(firedScroll('pinhigh')).toBe(false);
    });
  });
});
