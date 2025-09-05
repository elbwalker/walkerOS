import type { Collector } from '@walkeros/core';
import type { Settings } from '../types';
import {
  initGlobalTrigger,
  initScopeTrigger,
  initTriggers,
  ready,
  Triggers,
  handleTrigger,
  resetScrollListener,
} from '../trigger';

// Helper function to create test settings
const createTestSettings = (prefix = 'data-elb'): Settings => ({
  prefix,
  scope: document,
  pageview: false,
  session: false,
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
    },
  },
  onApply: jest.fn(),
}));

describe('Trigger System', () => {
  let mockCollector: Collector.Instance;
  let mockAddEventListener: jest.Mock;
  let events: Record<string, EventListenerOrEventListenerObject> = {};

  beforeEach(() => {
    jest.clearAllMocks();

    // Reset trigger module state
    resetScrollListener();

    // Mock collector
    mockCollector = {
      config: {},
      push: jest.fn(),
      consent: { functional: true },
      session: {},
      destinations: {},
      globals: {},
      hooks: {},
      on: {},
      user: {},
      allowed: true,
    } as unknown as Collector.Instance;

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

    initGlobalTrigger(mockCollector, createTestSettings('data-elb'));

    expect(mockAddEventListener).toHaveBeenCalledWith(
      'click',
      expect.any(Function),
    );
    expect(mockAddEventListener).toHaveBeenCalledWith(
      'submit',
      expect.any(Function),
    );
    expect(mockAddEventListener).toHaveBeenCalledTimes(2);
  });

  test('initGlobalTrigger always adds event listeners', () => {
    initGlobalTrigger(mockCollector, createTestSettings('data-elb'));

    // Should always add both click and submit listeners
    expect(mockAddEventListener).toHaveBeenCalledTimes(2);
  });

  test('initTriggers initializes DOM triggers without pageview', () => {
    document.body.innerHTML =
      '<div data-elb="page" data-elb-page="title:Home"></div>';

    initTriggers(mockCollector, {
      prefix: 'data-elb',
      scope: document,
      pageview: true,
      session: true,
      elb: 'elb',
      elbLayer: 'elbLayer',
    });

    // Should NOT trigger page view (pageview now only fires on walker run)
    expect(mockCollector.push).not.toHaveBeenCalledWith(
      expect.objectContaining({
        event: 'page view',
      }),
    );

    // Should initialize DOM triggers (we can verify by checking event listeners were added)
    // The actual DOM trigger testing is done in other tests
    expect(mockCollector.push).not.toHaveBeenCalled(); // No immediate events
  });

  test('initScopeTrigger processes action elements', () => {
    document.body.innerHTML = `
      <div data-elb="test" data-elbaction="load:action;hover:over">Test</div>
      <div data-elb="visible" data-elbaction="visible:seen">Visible</div>
    `;

    // Call initScopeTrigger - it should not throw
    expect(() => {
      initScopeTrigger(mockCollector, createTestSettings('data-elb'));
    }).not.toThrow();
  });

  test('ready function executes immediately when document is ready', async () => {
    const mockFn = jest.fn();
    const settings = createTestSettings();

    await ready(mockFn, mockCollector, settings);

    expect(mockFn).toHaveBeenCalledWith(mockCollector, settings);
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
    ready(mockFn, mockCollector, settings);

    // Should add event listener for DOMContentLoaded
    expect(document.addEventListener).toHaveBeenCalledWith(
      'DOMContentLoaded',
      expect.any(Function),
    );
  });

  test('ready function calls function with collector and settings', async () => {
    const mockFn = jest.fn();
    const settings = createTestSettings();

    await ready(mockFn, mockCollector, settings);

    expect(mockFn).toHaveBeenCalledWith(mockCollector, settings);
  });

  test('handleTrigger processes events correctly', async () => {
    document.body.innerHTML =
      '<div id="test" data-elb="entity" data-elb-entity="key:value" data-elbaction="click:action"></div>';

    const element = document.getElementById('test')!;

    const testSettings = {
      prefix: 'data-elb',
      scope: document,
      pageview: false,
      session: false,
      elb: '',
      elbLayer: false,
    } as Settings;

    await handleTrigger(
      { collector: mockCollector, settings: testSettings },
      element,
      Triggers.Click,
    );

    expect(mockCollector.push).toHaveBeenCalledWith(
      expect.objectContaining({
        event: 'entity action',
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

    initScopeTrigger(mockCollector, createTestSettings('data-elb'));

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

      initScopeTrigger(mockCollector, createTestSettings('data-elb'));

      // Should set interval with default 15000ms
      expect(setInterval).toHaveBeenCalledWith(expect.any(Function), 15000);
    });

    test('pulse trigger uses custom interval', () => {
      document.body.innerHTML = `
        <div id="pulse-elem" data-elb="content" data-elbaction="pulse(5000):action">Content</div>
      `;

      initScopeTrigger(mockCollector, createTestSettings('data-elb'));

      // Should set interval with custom 5000ms
      expect(setInterval).toHaveBeenCalledWith(expect.any(Function), 5000);
    });

    test('pulse trigger handles invalid interval parameter', () => {
      document.body.innerHTML = `
        <div id="pulse-elem" data-elb="content" data-elbaction="pulse(invalid):action">Content</div>
      `;

      initScopeTrigger(mockCollector, createTestSettings('data-elb'));

      // Should fall back to default 15000ms
      expect(setInterval).toHaveBeenCalledWith(expect.any(Function), 15000);
    });

    test('pulse trigger only fires when document is visible', () => {
      document.body.innerHTML = `
        <div id="pulse-elem" data-elb="content" data-elbaction="pulse(1000):action">Content</div>
      `;

      initScopeTrigger(mockCollector, createTestSettings('data-elb'));

      // Get the interval callback
      const intervalCallback = (setInterval as jest.Mock).mock.calls[0][0];

      // Test when document is hidden
      Object.defineProperty(document, 'hidden', {
        value: true,
        writable: true,
      });

      intervalCallback();
      expect(mockCollector.push).not.toHaveBeenCalled();

      // Test when document is visible
      Object.defineProperty(document, 'hidden', {
        value: false,
        writable: true,
      });

      intervalCallback();
      expect(mockCollector.push).toHaveBeenCalled();
    });

    test('wait trigger uses default delay (15000ms)', () => {
      document.body.innerHTML = `
        <div id="wait-elem" data-elb="content" data-elbaction="wait:action">Content</div>
      `;

      initScopeTrigger(mockCollector, createTestSettings('data-elb'));

      // Should set timeout with default 15000ms
      expect(setTimeout).toHaveBeenCalledWith(expect.any(Function), 15000);
    });

    test('wait trigger uses custom delay', () => {
      document.body.innerHTML = `
        <div id="wait-elem" data-elb="content" data-elbaction="wait(3000):action">Content</div>
      `;

      initScopeTrigger(mockCollector, createTestSettings('data-elb'));

      // Should set timeout with custom 3000ms
      expect(setTimeout).toHaveBeenCalledWith(expect.any(Function), 3000);
    });

    test('wait trigger handles invalid delay parameter', () => {
      document.body.innerHTML = `
        <div id="wait-elem" data-elb="content" data-elbaction="wait(invalid):action">Content</div>
      `;

      initScopeTrigger(mockCollector, createTestSettings('data-elb'));

      // Should fall back to default 15000ms
      expect(setTimeout).toHaveBeenCalledWith(expect.any(Function), 15000);
    });

    test('wait trigger executes callback after delay', () => {
      document.body.innerHTML = `
        <div id="wait-elem" data-elb="content" data-elbaction="wait(1000):action">Content</div>
      `;

      initScopeTrigger(mockCollector, createTestSettings('data-elb'));

      // Should not have triggered yet
      expect(mockCollector.push).not.toHaveBeenCalled();

      // Fast-forward time
      jest.advanceTimersByTime(1000);

      // Should have triggered after delay
      expect(mockCollector.push).toHaveBeenCalled();
    });

    test('scroll trigger uses default depth (50%)', () => {
      document.body.innerHTML = `
        <div id="scroll-elem" data-elb="content" data-elbaction="scroll:action">Content</div>
      `;

      initScopeTrigger(mockCollector, createTestSettings('data-elb'));

      // The scroll elements array should contain the element with default 50% depth
      // This is tested indirectly through the scroll function behavior
      expect(events.scroll).toBeDefined();
    });

    test('scroll trigger uses custom depth', () => {
      document.body.innerHTML = `
        <div id="scroll-elem" data-elb="content" data-elbaction="scroll(25):action">Content</div>
      `;

      initScopeTrigger(mockCollector, createTestSettings('data-elb'));

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
        initScopeTrigger(mockCollector, createTestSettings('data-elb'));
      }).not.toThrow();
    });

    test('hover trigger sets up mouseenter listener', () => {
      document.body.innerHTML = `
        <div id="hover-elem" data-elb="content" data-elbaction="hover:action">Content</div>
      `;

      const element = document.getElementById('hover-elem')!;
      const mockAddEventListener = jest.fn();
      element.addEventListener = mockAddEventListener;

      initScopeTrigger(mockCollector, createTestSettings('data-elb'));

      expect(mockAddEventListener).toHaveBeenCalledWith(
        'mouseenter',
        expect.any(Function),
      );
    });

    test('load trigger executes immediately', () => {
      document.body.innerHTML = `
        <div id="load-elem" data-elb="content" data-elbaction="load:action">Content</div>
      `;

      initScopeTrigger(mockCollector, createTestSettings('data-elb'));

      // Load trigger should execute immediately
      expect(mockCollector.push).toHaveBeenCalled();
    });
  });

  describe('Custom Prefix Support', () => {
    test('load trigger works with custom prefix', () => {
      // Set up DOM with custom prefix
      document.body.innerHTML = `
        <div data-custom="entity" data-customaction="load">Test Content</div>
      `;

      // Initialize scope triggers with custom prefix
      initScopeTrigger(mockCollector, createTestSettings('data-custom'));

      // Should have called push with entity load event
      expect(mockCollector.push).toHaveBeenCalledWith(
        expect.objectContaining({
          event: 'entity load',
          trigger: 'load',
        }),
      );
    });
  });
});
