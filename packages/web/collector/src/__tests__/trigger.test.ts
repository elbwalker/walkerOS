import { mockDataLayer } from '@walkerOS/jest/web.setup';
import { Trigger } from '../lib/trigger';
import { createWebCollector } from '../';

// Mock isVisible at module level
const mockIsVisible = jest.fn();
jest.mock('../utils', () => ({
  ...jest.requireActual('../utils'),
  isVisible: (element: HTMLElement) => mockIsVisible(element),
}));

describe('Trigger', () => {
  const w = window;
  const mockAddEventListener = jest.fn(); //.mockImplementation(console.log);

  let events: Record<string, EventListenerOrEventListenerObject> = {};

  beforeEach(() => {
    jest.spyOn(global, 'setTimeout');
    jest.spyOn(global, 'setInterval');
    global.performance.getEntriesByType = jest
      .fn()
      .mockReturnValue([{ type: 'navigate' }]);

    events = {};
    document.addEventListener = mockAddEventListener.mockImplementation(
      (event, callback) => {
        events[event] = callback;
      },
    );
  });

  test('elb', async () => {
    w.elbLayer = undefined as never;
    const { elb } = createWebCollector({ default: true, session: false });

    expect(w.elbLayer).toBeDefined();

    w.elbLayer.push = mockDataLayer;
    await elb('e a');
    expect(mockDataLayer).toHaveBeenCalledWith(
      expect.objectContaining({ event: 'e a' }),
    );
  });

  test('init global', () => {
    expect(mockAddEventListener).toHaveBeenCalledTimes(0);

    createWebCollector({ default: true, session: false });
    expect(mockAddEventListener).toHaveBeenCalledWith(
      Trigger.Click,
      expect.any(Function),
    );
    expect(mockAddEventListener).toHaveBeenCalledWith(
      Trigger.Submit,
      expect.any(Function),
    );
  });

  test('init scope', async () => {
    document.body.innerHTML = `<div id="init" data-elb="e" data-elbaction="load:all"><div data-elbaction="load:init"></div></div>`;
    const { elb } = createWebCollector({ default: true, session: false });

    // Both e load events should be triggered
    elb('walker init');
    await jest.runAllTimersAsync();
    expect(mockDataLayer).toHaveBeenCalledWith(
      expect.objectContaining({
        event: 'e all',
      }),
    );
    expect(mockDataLayer).toHaveBeenCalledWith(
      expect.objectContaining({
        event: 'e init',
      }),
    );

    jest.clearAllMocks();
    const elem = document.querySelector('#init div')!;

    // Only the e init event should be triggered
    await elb('walker init', elem);
    await jest.runAllTimersAsync();
    expect(mockDataLayer).not.toHaveBeenCalledWith(
      expect.objectContaining({ event: 'e all' }),
    );
    expect(mockDataLayer).toHaveBeenCalledWith(
      expect.objectContaining({ event: 'e init' }),
    );
  });

  test('load page view', async () => {
    const { elb } = createWebCollector({ dataLayer: true, session: false });
    document.body.setAttribute('data-elb-page', 'foo:bar');
    document.body.setAttribute('data-elbcontext', 'baz:qux');
    await elb('walker run');

    expect(mockDataLayer).toHaveBeenCalledWith(
      expect.objectContaining({
        event: 'page view',
        data: {
          foo: 'bar',
          domain: 'localhost',
          id: '/',
          title: '',
          referrer: '',
        },
        context: { baz: ['qux', 0] },
        trigger: Trigger.Load,
      }),
    );
    document.body.removeAttribute('data-elb-page');
    document.body.removeAttribute('data-elbcontext');
  });

  test('load view location and referrer', async () => {
    const location = document.location;
    const title = document.title;
    const referrer = document.referrer;

    document.title = 'Title';
    Object.defineProperty(window, 'location', {
      value: new URL('https://www.elbwalker.com/p?q=Analytics#hash'),
      writable: true,
    });
    Object.defineProperty(document, 'referrer', {
      value: 'https://www.github.com',
      writable: true,
    });

    // New page run on new page
    const { elb } = createWebCollector({ dataLayer: true, session: false });

    await elb('walker run');
    expect(mockDataLayer).toHaveBeenCalledWith(
      expect.objectContaining({
        event: 'page view',
        data: {
          domain: 'www.elbwalker.com',
          id: '/p',
          search: '?q=Analytics',
          hash: '#hash',
          title: 'Title',
          referrer: 'https://www.github.com',
        },
        trigger: Trigger.Load,
      }),
    );

    await elb('page click', { foo: 'bar' });
    expect(mockDataLayer).toHaveBeenCalledWith(
      expect.objectContaining({
        event: 'page click',
        data: {
          id: '/p', // Added automatically
          foo: 'bar',
        },
      }),
    );

    Object.defineProperty(window, 'location', {
      value: location,
      writable: true,
    });
    document.title = title;
    Object.defineProperty(document, 'referrer', {
      value: referrer,
      writable: true,
    });
  });

  test('load readyState loading', async () => {
    const { elb } = createWebCollector({
      dataLayer: true,
      session: false,
    });

    const readyState = document.readyState;
    Object.defineProperty(document, 'readyState', {
      value: 'loading',
      writable: true,
    });

    await elb('walker run');
    expect(mockDataLayer).toHaveBeenCalledTimes(0);

    (events.DOMContentLoaded as () => void)();

    await jest.runAllTimersAsync();
    expect(mockDataLayer).toHaveBeenCalledWith(
      expect.objectContaining({
        event: 'page view',
        trigger: Trigger.Load,
      }),
    );

    Object.defineProperty(document, 'readyState', {
      value: readyState,
      writable: true,
    });
  });

  test('click', async () => {
    document.body.innerHTML = `<div id="click" data-elb="e" data-elbaction="click"></div>`;
    createWebCollector({ default: true, session: false, pageview: false });

    const elem = document.getElementById('click');

    // Simulate submit event
    (events.click as (e: unknown) => void)({ target: elem } as Event);

    await jest.runAllTimersAsync();

    expect(mockDataLayer).toHaveBeenLastCalledWith(
      expect.objectContaining({
        event: 'e click',
        trigger: Trigger.Click,
      }),
    );
  });

  test('submit', async () => {
    document.body.innerHTML = `
      <form id="form" data-elb="form" data-elbaction="submit">
        <input type="text" />
        <button type="submit">Submit</button>
      </form>
    `;
    createWebCollector({ default: true, session: false, pageview: false });

    // https://developer.mozilla.org/en-US/docs/Web/API/HTMLFormElement/submit_event
    const form = document.getElementById('form');

    // Simulate submit event
    (events.submit as (e: unknown) => void)({ target: form } as Event);

    await jest.runOnlyPendingTimersAsync();
    expect(mockDataLayer).toHaveBeenLastCalledWith(
      expect.objectContaining({
        event: 'form submit',
        trigger: Trigger.Submit,
      }),
    );
  });

  test('hover', async () => {
    document.body.innerHTML = `<div id="hover" data-elb="mouse" data-elbaction="hover"></div>`;
    createWebCollector({ default: true, session: false, pageview: false });

    const elem = document.getElementById('hover') as Element;
    const hoverEvent = new MouseEvent('mouseenter', {
      view: window,
      bubbles: true,
      cancelable: true,
    });

    // jest.clearAllMocks();
    expect(mockDataLayer).not.toHaveBeenCalled();
    expect(mockDataLayer).toHaveBeenCalledTimes(0);

    // Simulate hover event
    elem.dispatchEvent(hoverEvent);
    await jest.runOnlyPendingTimersAsync();
    expect(mockDataLayer).toHaveBeenCalledTimes(1);

    expect(mockDataLayer).toHaveBeenLastCalledWith(
      expect.objectContaining({
        event: 'mouse hover',
        trigger: Trigger.Hover,
      }),
    );

    // Fire multiple hover event
    elem.dispatchEvent(hoverEvent);
    elem.dispatchEvent(hoverEvent);
    await jest.runOnlyPendingTimersAsync();
    expect(mockDataLayer).toHaveBeenCalledTimes(3);
  });

  test('wait', async () => {
    document.body.innerHTML = `<div data-elb="timer" data-elb-timer="its:time" data-elbaction="wait(4000):alarm"></div>`;
    createWebCollector({ default: true, session: false, pageview: false });

    expect(setTimeout).toHaveBeenLastCalledWith(expect.any(Function), 4000);

    expect(mockDataLayer).not.toHaveBeenCalledWith(
      expect.objectContaining({
        trigger: Trigger.Wait,
      }),
    );

    jest.clearAllMocks();

    // Simulate timer to total waiting time of 4000ms
    jest.advanceTimersByTime(4000);
    await jest.runOnlyPendingTimersAsync();

    expect(mockDataLayer).toHaveBeenLastCalledWith(
      expect.objectContaining({
        event: 'timer alarm',
        trigger: Trigger.Wait,
        data: { its: 'time' },
      }),
    );
  });

  test('pulse', async () => {
    document.body.innerHTML = `<div id="pulse" data-elb="pulse" data-elbaction="pulse(5000):beat"></div>`;
    createWebCollector({ default: true, session: false, pageview: false });

    expect(setInterval).toHaveBeenCalledWith(expect.any(Function), 5000);

    expect(mockDataLayer).not.toHaveBeenCalledWith(
      expect.objectContaining({
        trigger: Trigger.Pulse,
      }),
    );

    jest.clearAllMocks();

    jest.advanceTimersByTime(2500);

    expect(mockDataLayer).not.toHaveBeenCalled();

    jest.advanceTimersByTime(2500);
    await jest.runOnlyPendingTimersAsync();

    expect(mockDataLayer).toHaveBeenLastCalledWith(
      expect.objectContaining({
        event: 'pulse beat',
        trigger: Trigger.Pulse,
      }),
    );

    jest.clearAllMocks();
    expect(mockDataLayer).not.toHaveBeenCalled();

    jest.advanceTimersByTime(5000);
    await jest.runOnlyPendingTimersAsync();
    expect(mockDataLayer).toHaveBeenLastCalledWith(
      expect.objectContaining({
        event: 'pulse beat',
        trigger: Trigger.Pulse,
      }),
    );

    // Test the active page check
    Object.defineProperty(document, 'hidden', {
      value: true,
      writable: true,
    });

    jest.clearAllMocks();
    jest.advanceTimersByTime(10000);
    expect(mockDataLayer).not.toHaveBeenCalled();

    Object.defineProperty(document, 'hidden', {
      value: false,
      writable: true,
    });

    jest.clearAllMocks();
    jest.advanceTimersByTime(5000);
    await jest.runOnlyPendingTimersAsync();
    expect(mockDataLayer).toHaveBeenCalled();
  });

  test('scroll', async () => {
    // New collector without cached scroll listener
    document.body.innerHTML = `<div id="scroll" data-elb="scroll" data-elbaction="scroll(80):80percent"></div>`;
    createWebCollector({ default: true, session: false, pageview: false });

    const innerHeight = window.innerHeight;
    const elem = document.getElementById('scroll') as HTMLElement;

    expect(mockAddEventListener).toHaveBeenCalledWith(
      Trigger.Scroll,
      expect.any(Function),
    );

    jest.clearAllMocks();

    // Create a small window
    window.innerHeight = 10;

    // Position element and set a height
    Object.defineProperty(elem, 'offsetTop', {
      value: 100,
      writable: true,
    });
    Object.defineProperty(elem, 'clientHeight', {
      value: 50,
      writable: true,
    });

    const scrollFn = events.scroll as (e: unknown) => void;
    // Simulate scroll event
    scrollFn({});

    expect(mockDataLayer).not.toHaveBeenCalled();

    // Scroll to 50% of elem in viewport
    window.scrollY = 115;

    // Skip throttling timer
    jest.advanceTimersByTime(1000);
    scrollFn({});

    // Not 80% in viewport yet
    expect(mockDataLayer).not.toHaveBeenCalled();

    // Scroll to 50% of elem in viewport
    window.scrollY = 170;

    // Skip throttling timer
    jest.advanceTimersByTime(1000);
    scrollFn({});

    await jest.runOnlyPendingTimersAsync();

    expect(mockDataLayer).toHaveBeenCalledWith(
      expect.objectContaining({
        event: 'scroll 80percent',
        trigger: Trigger.Scroll,
      }),
    );

    window.innerHeight = innerHeight;
  });

  describe('visible trigger', () => {
    let mockObserve: jest.Mock;
    let mockUnobserve: jest.Mock;
    let mockDisconnect: jest.Mock;
    let observerCallback: (
      entries: IntersectionObserverEntry[],
      observer: IntersectionObserver,
    ) => void;

    const createMockEntry = (
      target: HTMLElement,
      intersectionRatio: number,
    ): IntersectionObserverEntry => ({
      target,
      intersectionRatio,
      isIntersecting: intersectionRatio > 0,
      boundingClientRect: {} as DOMRectReadOnly,
      intersectionRect: {} as DOMRectReadOnly,
      rootBounds: {} as DOMRectReadOnly,
      time: Date.now(),
    });

    beforeEach(() => {
      // Reset isVisible mock
      mockIsVisible.mockReturnValue(true);

      // Mock Intersection Observer
      mockObserve = jest.fn();
      mockUnobserve = jest.fn();
      mockDisconnect = jest.fn();
      w.IntersectionObserver = jest.fn((callback) => {
        observerCallback = callback;
        return {
          observe: mockObserve,
          unobserve: mockUnobserve,
          disconnect: mockDisconnect,
        } as unknown as IntersectionObserver;
      });

      jest.spyOn(global, 'setTimeout');
      jest.spyOn(global, 'clearTimeout');
    });

    test('50% threshold - should trigger at 50% intersection', async () => {
      document.body.innerHTML = `<div id="visible" data-elb="visible" data-elbaction="visible:impression"></div>`;
      const { createWebCollector } = jest.requireActual('../');
      createWebCollector({ default: true, session: false, pageview: false });

      const target = document.getElementById('visible') as HTMLElement;
      jest.clearAllMocks();

      // Test 50% intersection - should trigger
      observerCallback(
        [createMockEntry(target, 0.5)],
        {} as IntersectionObserver,
      );

      expect(setTimeout).toHaveBeenCalledTimes(1);
      expect(mockIsVisible).not.toHaveBeenCalled(); // isVisible called only in timer callback

      await jest.runOnlyPendingTimersAsync();

      expect(mockIsVisible).toHaveBeenCalledWith(target); // Now isVisible should be called
      expect(mockDataLayer).toHaveBeenCalledWith(
        expect.objectContaining({
          event: 'visible impression',
          trigger: Trigger.Visible,
        }),
      );
      expect(mockUnobserve).toHaveBeenCalledWith(target);
    });

    test('49% threshold - should NOT trigger below 50% intersection', async () => {
      document.body.innerHTML = `<div id="visible" data-elb="visible" data-elbaction="visible:impression"></div>`;
      const { createWebCollector } = jest.requireActual('../');
      createWebCollector({ default: true, session: false, pageview: false });

      const target = document.getElementById('visible') as HTMLElement;
      jest.clearAllMocks();

      // Test 49% intersection - should NOT trigger
      observerCallback(
        [createMockEntry(target, 0.49)],
        {} as IntersectionObserver,
      );

      expect(setTimeout).not.toHaveBeenCalled();
      expect(mockIsVisible).not.toHaveBeenCalled();

      await jest.runOnlyPendingTimersAsync();

      expect(mockDataLayer).not.toHaveBeenCalled();
      expect(mockUnobserve).not.toHaveBeenCalled();
    });

    test('large element behavior - should trigger when height > viewport and isVisible true', async () => {
      document.body.innerHTML = `<div id="large" data-elb="large" data-elbaction="visible:impression"></div>`;
      const { createWebCollector } = jest.requireActual('../');
      createWebCollector({ default: true, session: false, pageview: false });

      const target = document.getElementById('large') as HTMLElement;
      // Mock large element
      Object.defineProperty(target, 'offsetHeight', {
        value: window.innerHeight + 100,
      });
      jest.clearAllMocks();

      // Large element with any intersection + isVisible true
      observerCallback(
        [createMockEntry(target, 0.3)],
        {} as IntersectionObserver,
      ); // Below 50% but should trigger for large elements

      expect(setTimeout).toHaveBeenCalledTimes(1);
      expect(mockIsVisible).toHaveBeenCalledWith(target);

      await jest.runOnlyPendingTimersAsync();

      expect(mockDataLayer).toHaveBeenCalledWith(
        expect.objectContaining({
          event: 'large impression',
          trigger: Trigger.Visible,
        }),
      );
    });

    test('isVisible integration - should NOT trigger when isVisible returns false', async () => {
      document.body.innerHTML = `<div id="hidden" data-elb="hidden" data-elbaction="visible:impression"></div>`;
      const { createWebCollector } = jest.requireActual('../');
      createWebCollector({ default: true, session: false, pageview: false });

      const target = document.getElementById('hidden') as HTMLElement;
      mockIsVisible.mockReturnValue(false); // Element is hidden by overlay
      jest.clearAllMocks();

      // 100% intersection but isVisible false
      observerCallback(
        [createMockEntry(target, 1.0)],
        {} as IntersectionObserver,
      );

      expect(setTimeout).toHaveBeenCalledTimes(1);

      await jest.runOnlyPendingTimersAsync();

      expect(mockIsVisible).toHaveBeenCalledWith(target);
      expect(mockDataLayer).not.toHaveBeenCalled();
      expect(mockUnobserve).not.toHaveBeenCalled();
    });

    test('timing behavior - element hidden before duration should cancel trigger', async () => {
      document.body.innerHTML = `<div id="timing" data-elb="timing" data-elbaction="visible:impression"></div>`;
      const { createWebCollector } = jest.requireActual('../');
      createWebCollector({ default: true, session: false, pageview: false });

      const target = document.getElementById('timing') as HTMLElement;
      jest.clearAllMocks();

      // Element becomes visible
      observerCallback(
        [createMockEntry(target, 0.8)],
        {} as IntersectionObserver,
      );

      expect(setTimeout).toHaveBeenCalledTimes(1);

      // Element becomes hidden before timer completes
      observerCallback(
        [createMockEntry(target, 0.2)],
        {} as IntersectionObserver,
      );

      expect(clearTimeout).toHaveBeenCalledTimes(1);

      await jest.runOnlyPendingTimersAsync();

      expect(mockDataLayer).not.toHaveBeenCalled();
    });

    test('multiple elements - should handle multiple observations simultaneously', async () => {
      document.body.innerHTML = `
        <div id="elem1" data-elb="elem1" data-elbaction="visible:impression"></div>
        <div id="elem2" data-elb="elem2" data-elbaction="visible:view"></div>
      `;
      const { createWebCollector } = jest.requireActual('../');
      createWebCollector({ default: true, session: false, pageview: false });

      const elem1 = document.getElementById('elem1') as HTMLElement;
      const elem2 = document.getElementById('elem2') as HTMLElement;
      jest.clearAllMocks();

      // Both elements become visible simultaneously
      observerCallback(
        [createMockEntry(elem1, 0.6), createMockEntry(elem2, 0.7)],
        {} as IntersectionObserver,
      );

      expect(setTimeout).toHaveBeenCalledTimes(2);

      await jest.runOnlyPendingTimersAsync();

      expect(mockDataLayer).toHaveBeenCalledTimes(2);
      expect(mockDataLayer).toHaveBeenCalledWith(
        expect.objectContaining({
          event: 'elem1 impression',
        }),
      );
      expect(mockDataLayer).toHaveBeenCalledWith(
        expect.objectContaining({
          event: 'elem2 view',
        }),
      );
    });

    test('observer lifecycle - should create observer for each collector', async () => {
      document.body.innerHTML = `<div id="lifecycle" data-elb="lifecycle" data-elbaction="visible:impression"></div>`;
      const { createWebCollector } = jest.requireActual('../');
      createWebCollector({ default: true, session: false, pageview: false });

      // Should create IntersectionObserver for new collector
      expect(w.IntersectionObserver).toHaveBeenCalled();
    });

    test('one-time trigger - should unobserve after successful trigger', async () => {
      document.body.innerHTML = `<div id="onetime" data-elb="onetime" data-elbaction="visible:impression"></div>`;
      const { createWebCollector } = jest.requireActual('../');
      createWebCollector({ default: true, session: false, pageview: false });

      const target = document.getElementById('onetime') as HTMLElement;
      jest.clearAllMocks();

      // Trigger visibility
      observerCallback(
        [createMockEntry(target, 0.8)],
        {} as IntersectionObserver,
      );

      await jest.runOnlyPendingTimersAsync();

      expect(mockDataLayer).toHaveBeenCalledTimes(1);
      expect(mockUnobserve).toHaveBeenCalledWith(target);

      // Verify that the timer dataset was cleaned up
      expect(target.dataset['elbTimerId']).toBeUndefined();
    });
  });
});
