import type { Elb } from '@walkeros/core';
import { isObject } from '@walkeros/core';
import type { Settings } from '../types';
import {
  initGlobalTrigger,
  initScopeTrigger,
  initTriggers,
  ready,
  Triggers,
  handleTrigger,
  resetScrollListener,
  destroyTriggers,
} from '../trigger';
import { destroyVisibilityTracking } from '../triggerVisible';

// Helper function to create test settings
const createTestSettings = (prefix = 'data-elb'): Settings => ({
  prefix,
  scope: document,
  pageview: false,
  elb: '',
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

  beforeEach(() => {
    jest.clearAllMocks();

    // Reset trigger module state (scroll state + global AbortController)
    resetScrollListener();
    destroyTriggers(createTestSettings());

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
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  test('Triggers constants are defined correctly', () => {
    expect(Triggers.Click).toBe('click');
    expect(Triggers.Load).toBe('load');
    expect(Triggers.Hover).toBe('hover');
    expect(Triggers.Submit).toBe('submit');
    expect(Triggers.Impression).toBe('impression');
    expect(Triggers.Visible).toBe('visible');
    expect(Triggers.Scroll).toBe('scroll');
    expect(Triggers.Pulse).toBe('pulse');
    expect(Triggers.Wait).toBe('wait');
  });

  test('initGlobalTrigger sets up click and submit listeners', () => {
    expect(mockAddEventListener).toHaveBeenCalledTimes(0);

    const context = { elb: mockElb, settings: createTestSettings('data-elb') };
    initGlobalTrigger(context, createTestSettings('data-elb'));

    expect(mockAddEventListener).toHaveBeenCalledWith(
      'click',
      expect.any(Function),
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    );
    expect(mockAddEventListener).toHaveBeenCalledWith(
      'submit',
      expect.any(Function),
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    );
    expect(mockAddEventListener).toHaveBeenCalledTimes(2);
  });

  test('initGlobalTrigger always adds event listeners', () => {
    const context = { elb: mockElb, settings: createTestSettings('data-elb') };
    initGlobalTrigger(context, createTestSettings('data-elb'));

    // Should always add both click and submit listeners
    expect(mockAddEventListener).toHaveBeenCalledTimes(2);
  });

  test('initTriggers initializes DOM triggers without pageview', () => {
    document.body.innerHTML =
      '<div data-elb="page" data-elb-page="title:Home"></div>';

    const context = { elb: mockElb, settings: createTestSettings('data-elb') };
    initTriggers(context, {
      prefix: 'data-elb',
      scope: document,
      pageview: true,
      elb: 'elb',
      elbLayer: 'elbLayer',
    });

    // Should NOT trigger page view (pageview now only fires on walker run)
    expect(mockElb).not.toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'page view',
      }),
    );

    // Should initialize DOM triggers (we can verify by checking event listeners were added)
    // The actual DOM trigger testing is done in other tests
    expect(mockElb).not.toHaveBeenCalled(); // No immediate events
  });

  test('initScopeTrigger processes action elements', () => {
    document.body.innerHTML = `
      <div data-elb="test" data-elbaction="load:action;hover:over">Test</div>
      <div data-elb="visible" data-elbaction="visible:seen">Visible</div>
    `;

    // Call initScopeTrigger - it should not throw
    expect(() => {
      const context = {
        push: jest.fn(),
        command: jest.fn(),
        elb: mockElb,
        settings: createTestSettings('data-elb'),
      };
      initScopeTrigger(context, createTestSettings('data-elb'));
    }).not.toThrow();
  });

  test('ready function executes immediately when document is ready', async () => {
    const mockFn = jest.fn();
    const settings = createTestSettings();
    const context = { elb: mockElb, settings };

    await ready(mockFn, context, settings);

    expect(mockFn).toHaveBeenCalledWith(context, settings);
  });

  test('ready function waits for DOMContentLoaded when document is loading', () => {
    Object.defineProperty(document, 'readyState', {
      value: 'loading',
      writable: true,
    });

    const mockFn = jest.fn().mockReturnValue('result');

    document.addEventListener = jest.fn().mockImplementation(() => {
      // Mock implementation for DOMContentLoaded listener
    });

    const settings = createTestSettings();
    const context = { elb: mockElb, settings };
    ready(mockFn, context, settings);

    // Should add event listener for DOMContentLoaded
    expect(document.addEventListener).toHaveBeenCalledWith(
      'DOMContentLoaded',
      expect.any(Function),
    );
  });

  test('ready function calls function with collector and settings', async () => {
    const mockFn = jest.fn();
    const settings = createTestSettings();
    const context = { elb: mockElb, settings };

    await ready(mockFn, context, settings);

    expect(mockFn).toHaveBeenCalledWith(context, settings);
  });

  test('handleTrigger processes events correctly', async () => {
    document.body.innerHTML =
      '<div id="test" data-elb="entity" data-elb-entity="key:value" data-elbaction="click:action"></div>';

    const element = document.getElementById('test')!;

    const testSettings = {
      prefix: 'data-elb',
      scope: document,
      pageview: false,
      elb: '',
      elbLayer: false,
    } as Settings;

    await handleTrigger(
      { elb: mockElb, settings: testSettings },
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

  test('scroll trigger processes scroll depth correctly', () => {
    document.body.innerHTML = `
      <div style="height: 1000px;">
        <div id="scroll-elem" data-elb="content" data-elbaction="scroll:50">Content</div>
      </div>
    `;

    // Set up window dimensions
    Object.defineProperty(window, 'innerHeight', {
      value: 500,
      writable: true,
    });
    Object.defineProperty(window, 'scrollY', { value: 0, writable: true });

    const element = document.getElementById('scroll-elem')!;
    Object.defineProperty(element, 'offsetTop', { value: 200 });
    Object.defineProperty(element, 'clientHeight', { value: 300 });

    initScopeTrigger(
      { elb: mockElb, settings: createTestSettings('data-elb') },
      createTestSettings('data-elb'),
    );

    // Verify scroll listener was added
    expect(events.scroll).toBeDefined();
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

    test('pulse trigger uses default interval (15000ms)', () => {
      document.body.innerHTML = `
        <div id="pulse-elem" data-elb="content" data-elbaction="pulse:action">Content</div>
      `;

      initScopeTrigger(
        { elb: mockElb, settings: createTestSettings('data-elb') },
        createTestSettings('data-elb'),
      );

      // Should set interval with default 15000ms
      expect(setInterval).toHaveBeenCalledWith(expect.any(Function), 15000);
    });

    test('pulse trigger uses custom interval', () => {
      document.body.innerHTML = `
        <div id="pulse-elem" data-elb="content" data-elbaction="pulse(5000):action">Content</div>
      `;

      initScopeTrigger(
        { elb: mockElb, settings: createTestSettings('data-elb') },
        createTestSettings('data-elb'),
      );

      // Should set interval with custom 5000ms
      expect(setInterval).toHaveBeenCalledWith(expect.any(Function), 5000);
    });

    test('pulse trigger handles invalid interval parameter', () => {
      document.body.innerHTML = `
        <div id="pulse-elem" data-elb="content" data-elbaction="pulse(invalid):action">Content</div>
      `;

      initScopeTrigger(
        { elb: mockElb, settings: createTestSettings('data-elb') },
        createTestSettings('data-elb'),
      );

      // Should fall back to default 15000ms
      expect(setInterval).toHaveBeenCalledWith(expect.any(Function), 15000);
    });

    test('pulse trigger only fires when document is visible', () => {
      document.body.innerHTML = `
        <div id="pulse-elem" data-elb="content" data-elbaction="pulse(1000):action">Content</div>
      `;

      initScopeTrigger(
        { elb: mockElb, settings: createTestSettings('data-elb') },
        createTestSettings('data-elb'),
      );

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

    test('wait trigger uses default delay (15000ms)', () => {
      document.body.innerHTML = `
        <div id="wait-elem" data-elb="content" data-elbaction="wait:action">Content</div>
      `;

      initScopeTrigger(
        { elb: mockElb, settings: createTestSettings('data-elb') },
        createTestSettings('data-elb'),
      );

      // Should set timeout with default 15000ms
      expect(setTimeout).toHaveBeenCalledWith(expect.any(Function), 15000);
    });

    test('wait trigger uses custom delay', () => {
      document.body.innerHTML = `
        <div id="wait-elem" data-elb="content" data-elbaction="wait(3000):action">Content</div>
      `;

      initScopeTrigger(
        { elb: mockElb, settings: createTestSettings('data-elb') },
        createTestSettings('data-elb'),
      );

      // Should set timeout with custom 3000ms
      expect(setTimeout).toHaveBeenCalledWith(expect.any(Function), 3000);
    });

    test('wait trigger handles invalid delay parameter', () => {
      document.body.innerHTML = `
        <div id="wait-elem" data-elb="content" data-elbaction="wait(invalid):action">Content</div>
      `;

      initScopeTrigger(
        { elb: mockElb, settings: createTestSettings('data-elb') },
        createTestSettings('data-elb'),
      );

      // Should fall back to default 15000ms
      expect(setTimeout).toHaveBeenCalledWith(expect.any(Function), 15000);
    });

    test('wait trigger executes callback after delay', () => {
      document.body.innerHTML = `
        <div id="wait-elem" data-elb="content" data-elbaction="wait(1000):action">Content</div>
      `;

      initScopeTrigger(
        { elb: mockElb, settings: createTestSettings('data-elb') },
        createTestSettings('data-elb'),
      );

      // Should not have triggered yet
      expect(mockElb).not.toHaveBeenCalled();

      // Fast-forward time
      jest.advanceTimersByTime(1000);

      // Should have triggered after delay
      expect(mockElb).toHaveBeenCalled();
    });

    test('scroll trigger uses default depth (50%)', () => {
      document.body.innerHTML = `
        <div id="scroll-elem" data-elb="content" data-elbaction="scroll:action">Content</div>
      `;

      initScopeTrigger(
        { elb: mockElb, settings: createTestSettings('data-elb') },
        createTestSettings('data-elb'),
      );

      // The scroll elements array should contain the element with default 50% depth
      // This is tested indirectly through the scroll function behavior
      expect(events.scroll).toBeDefined();
    });

    test('scroll trigger uses custom depth', () => {
      document.body.innerHTML = `
        <div id="scroll-elem" data-elb="content" data-elbaction="scroll(25):action">Content</div>
      `;

      initScopeTrigger(
        { elb: mockElb, settings: createTestSettings('data-elb') },
        createTestSettings('data-elb'),
      );

      // The scroll elements array should contain the element with custom 25% depth
      expect(events.scroll).toBeDefined();
    });

    test('scroll trigger ignores invalid depth parameters', () => {
      document.body.innerHTML = `
        <div id="scroll-elem1" data-elb="content" data-elbaction="scroll(-10):action">Content</div>
        <div id="scroll-elem2" data-elb="content" data-elbaction="scroll(150):action">Content</div>
        <div id="scroll-elem3" data-elb="content" data-elbaction="scroll(invalid):action">Content</div>
      `;

      // Should not throw for invalid parameters
      expect(() => {
        initScopeTrigger(
          { elb: mockElb, settings: createTestSettings('data-elb') },
          createTestSettings('data-elb'),
        );
      }).not.toThrow();
    });

    test('hover trigger sets up mouseenter listener with an abort signal', () => {
      document.body.innerHTML = `
        <div id="hover-elem" data-elb="content" data-elbaction="hover:action">Content</div>
      `;

      const element = document.getElementById('hover-elem')!;
      const mockAddEventListener = jest.fn();
      element.addEventListener = mockAddEventListener;

      initScopeTrigger(
        { elb: mockElb, settings: createTestSettings('data-elb') },
        createTestSettings('data-elb'),
      );

      expect(mockAddEventListener).toHaveBeenCalledWith(
        'mouseenter',
        expect.any(Function),
        expect.objectContaining({ signal: expect.any(AbortSignal) }),
      );
    });

    test('load trigger executes immediately', () => {
      document.body.innerHTML = `
        <div id="load-elem" data-elb="content" data-elbaction="load:action">Content</div>
      `;

      initScopeTrigger(
        { elb: mockElb, settings: createTestSettings('data-elb') },
        createTestSettings('data-elb'),
      );

      // Load trigger should execute immediately
      expect(mockElb).toHaveBeenCalled();
    });

    describe('Pulse cleanup', () => {
      test('pulse interval is cleared on destroyTriggers', () => {
        document.body.innerHTML = `
          <div id="pulse-elem" data-elb="content" data-elbaction="pulse(1000):action">Content</div>
        `;

        const settings = createTestSettings('data-elb');
        const clearIntervalSpy = jest.spyOn(global, 'clearInterval');

        initScopeTrigger({ elb: mockElb, settings }, settings);

        expect(setInterval).toHaveBeenCalledWith(expect.any(Function), 1000);

        destroyTriggers(settings);

        expect(clearIntervalSpy).toHaveBeenCalled();
      });

      test('pulse does not fire after destroyTriggers', () => {
        document.body.innerHTML = `
          <div id="pulse-elem" data-elb="content" data-elbaction="pulse(1000):action">Content</div>
        `;

        const settings = createTestSettings('data-elb');

        initScopeTrigger({ elb: mockElb, settings }, settings);
        destroyTriggers(settings);

        jest.advanceTimersByTime(5000);

        expect(mockElb).not.toHaveBeenCalled();
      });
    });

    describe('Wait cleanup', () => {
      test('wait timeout is cleared on destroyTriggers', () => {
        document.body.innerHTML = `
          <div id="wait-elem" data-elb="content" data-elbaction="wait(2000):action">Content</div>
        `;

        const settings = createTestSettings('data-elb');
        const clearTimeoutSpy = jest.spyOn(global, 'clearTimeout');

        initScopeTrigger({ elb: mockElb, settings }, settings);

        expect(setTimeout).toHaveBeenCalledWith(expect.any(Function), 2000);

        destroyTriggers(settings);

        expect(clearTimeoutSpy).toHaveBeenCalled();
      });

      test('wait does not fire after destroyTriggers', () => {
        document.body.innerHTML = `
          <div id="wait-elem" data-elb="content" data-elbaction="wait(1000):action">Content</div>
        `;

        const settings = createTestSettings('data-elb');

        initScopeTrigger({ elb: mockElb, settings }, settings);
        mockElb.mockClear();
        destroyTriggers(settings);

        jest.advanceTimersByTime(5000);

        expect(mockElb).not.toHaveBeenCalled();
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
      initScopeTrigger(
        { elb: mockElb, settings: createTestSettings('data-custom') },
        createTestSettings('data-custom'),
      );

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
    test('destroyTriggers removes click and submit listeners from scope', () => {
      // A fresh element uses the real addEventListener so the
      // AbortController signal applies (only document.addEventListener is mocked).
      const scope = document.createElement('div');

      const settings: Settings = {
        prefix: 'data-elb',
        scope,
        pageview: false,
        elb: '',
        elbLayer: false,
      };
      const context = { elb: mockElb, settings };

      initGlobalTrigger(context, settings);
      destroyTriggers(settings);

      scope.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      scope.dispatchEvent(new Event('submit', { bubbles: true }));

      expect(mockElb).not.toHaveBeenCalled();
    });

    test('destroyTriggers removes hover listeners added to individual elements', () => {
      document.body.innerHTML = `
        <div id="hover-elem" data-elb="content" data-elbaction="hover:action">Content</div>
      `;
      const element = document.getElementById('hover-elem')!;

      const settings = createTestSettings('data-elb');
      const context = { elb: mockElb, settings };

      // Establish the global AbortController so hover listeners carry its signal
      initGlobalTrigger(context, settings);
      initScopeTrigger(context, settings);
      destroyTriggers(settings);

      element.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }));

      expect(mockElb).not.toHaveBeenCalledWith(
        expect.objectContaining({ trigger: Triggers.Hover }),
      );
    });

    test('calling destroyTriggers before initTriggers does not throw', () => {
      const settings = createTestSettings('data-elb');
      expect(() => destroyTriggers(settings)).not.toThrow();
    });
  });

  describe('Abort signal coverage on every listener registration', () => {
    test('hover registers with a signal even when no globalAbortController exists yet', () => {
      // Simulate the bug scenario: a session was torn down (or never started),
      // so globalAbortController is undefined when triggerHover registers.
      destroyTriggers(createTestSettings('data-elb'));

      document.body.innerHTML = `
        <div id="hover-elem" data-elb="content" data-elbaction="hover:action">Content</div>
      `;
      const element = document.getElementById('hover-elem')!;
      const spy = jest.fn();
      element.addEventListener = spy;

      initScopeTrigger(
        { elb: mockElb, settings: createTestSettings('data-elb') },
        createTestSettings('data-elb'),
      );

      expect(spy).toHaveBeenCalledWith(
        'mouseenter',
        expect.any(Function),
        expect.objectContaining({ signal: expect.any(AbortSignal) }),
      );
    });

    test('scroll registers with a signal even when no globalAbortController exists yet', () => {
      destroyTriggers(createTestSettings('data-elb'));
      resetScrollListener();

      document.body.innerHTML = `
        <div style="height: 1000px;">
          <div id="scroll-elem" data-elb="content" data-elbaction="scroll(50):action">Content</div>
        </div>
      `;

      initScopeTrigger(
        { elb: mockElb, settings: createTestSettings('data-elb') },
        createTestSettings('data-elb'),
      );

      // The shared mockAddEventListener (document.addEventListener) captured the scroll registration.
      expect(mockAddEventListener).toHaveBeenCalledWith(
        'scroll',
        expect.any(Function),
        expect.objectContaining({ signal: expect.any(AbortSignal) }),
      );
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
      const context = { elb: mockElb, settings };

      initScopeTrigger(context, settings);
      initScopeTrigger(context, settings);

      jest.advanceTimersByTime(1000);

      // RED today: two intervals stack → two events per tick.
      expect(countTrigger('pulse')).toBe(1);
    });

    test('1b wait: double init fires once', () => {
      document.body.innerHTML = `
        <div data-elb="content" data-elbaction="wait(1000):action">Content</div>
      `;

      const settings = createTestSettings('data-elb');
      const context = { elb: mockElb, settings };

      initScopeTrigger(context, settings);
      initScopeTrigger(context, settings);

      jest.advanceTimersByTime(1000);

      // RED today: two timeouts stack → fires twice.
      expect(countTrigger('wait')).toBe(1);
    });

    test('1c hover: double init fires once per mouseenter', () => {
      document.body.innerHTML = `
        <div id="hover-elem" data-elb="content" data-elbaction="hover:action">Content</div>
      `;
      const element = document.getElementById('hover-elem')!;

      const settings = createTestSettings('data-elb');
      const context = { elb: mockElb, settings };

      initScopeTrigger(context, settings);
      initScopeTrigger(context, settings);

      element.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }));

      // RED today: two listeners stack → fires twice on one dispatch.
      expect(countTrigger('hover')).toBe(1);
    });

    test('1d load: double init fires twice (intended, not deduped)', () => {
      document.body.innerHTML = `
        <div data-elb="content" data-elbaction="load:action">Content</div>
      `;

      const settings = createTestSettings('data-elb');
      const context = { elb: mockElb, settings };

      initScopeTrigger(context, settings);
      initScopeTrigger(context, settings);

      // GREEN today and after: load is immediate and re-fires per init.
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
      const rootContext = { elb: mockElb, settings: rootSettings };
      initGlobalTrigger(rootContext, rootSettings);

      const container = document.createElement('div');
      document.body.appendChild(container);
      const containerSettings: Settings = {
        ...createTestSettings('data-elb'),
        scope: container,
      };
      const containerContext = { elb: mockElb, settings: containerSettings };
      initScopeTrigger(containerContext, containerSettings);

      rootScope
        .querySelector('button')!
        .dispatchEvent(new MouseEvent('click', { bubbles: true }));

      // GREEN today and after: the root click listener survives the sub init.
      expect(countTrigger('click')).toBe(1);
    });
  });

  describe('Scoped re-init (walker init <element>)', () => {
    // Scope is a single carrier: it lives in context.settings.scope. The
    // translation layer builds a scope-aligned context for `walker init <el>`,
    // so every observer create/lookup reads the same scope. C-core then
    // normalizes that scope to its owner document, giving one shared observer
    // per document. Each created observer is captured so we can assert WHICH
    // one an element lands on (and whether it is still live).
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

    test('a sub-scoped init registers the scope’s visible elements on the shared observer', () => {
      document.body.innerHTML = `
        <section id="injected">
          <div id="promo" data-elb="promo" data-elbaction="visible:view(promo)"></div>
        </section>
      `;
      const settings = createTestSettings('data-elb'); // source context: scope = document
      const context = { elb: mockElb, settings };
      const container = document.getElementById('injected')!;
      const promo = document.getElementById('promo')!;

      // `walker init <container>`: the translation layer builds a scope-aligned
      // context whose settings.scope is the container. The sub-scope init scans
      // the container, finds its visible element, and observes it on the shared
      // per-document observer (C-core normalizes the container to its document).
      initScopeTrigger({
        ...context,
        settings: { ...context.settings, scope: container },
      });

      // One shared per-document observer is created, and the container's own
      // visible element is registered on it exactly once.
      expect(observers.length).toBeGreaterThan(0);
      expect(observedOn(promo)).toBe(1);

      destroyVisibilityTracking(document);
      destroyVisibilityTracking(container);
    });

    test('2b a document-scope run observes its visible elements', () => {
      document.body.innerHTML = `
        <div id="promo" data-elb="promo" data-elbaction="visible:view(promo)"></div>
      `;
      const settings = createTestSettings('data-elb'); // scope = document
      const context = { elb: mockElb, settings };
      const promo = document.getElementById('promo')!;

      initScopeTrigger(context, settings);

      // `walker run` aligns scope on both sides, so the element is observed.
      expect(observedOn(promo)).toBe(1);

      destroyVisibilityTracking(document);
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
      const context = { elb: mockElb, settings };

      initScopeTrigger(context, settings);
      initScopeTrigger(context, settings);

      // No stacking: the prior registration is torn down, the element ends up
      // on exactly one live observer.
      expect(liveObservedOn(promo)).toBe(1);

      destroyVisibilityTracking(container);
      destroyVisibilityTracking(document);
    });
  });
});
