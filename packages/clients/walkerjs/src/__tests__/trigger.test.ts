import { elb, Walkerjs } from '..';
import { mockDataLayer } from '@elbwalker/jest/web.setup';
import { Trigger } from '../lib/trigger';
import fs from 'fs';

describe('Trigger', () => {
  const w = window;

  const mockAddEventListener = jest.fn(); //.mockImplementation(console.log);

  let events: Record<string, EventListenerOrEventListenerObject> = {};
  const html: string = fs
    .readFileSync(__dirname + '/html/trigger.html')
    .toString();

  beforeEach(() => {
    document.body.innerHTML = html;

    jest.useFakeTimers();
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

    Walkerjs({ default: true });
  });

  test('elb', () => {
    w.elbLayer = undefined as never;
    elb('e a');
    expect(w.elbLayer).toBeDefined();

    w.elbLayer.push = mockDataLayer;
    elb('e a');
    expect(mockDataLayer).toHaveBeenCalledWith(
      expect.objectContaining(['e a']),
    );
  });

  test('init global', () => {
    expect(mockAddEventListener).toHaveBeenCalledWith(
      Trigger.Click,
      expect.any(Function),
    );
    expect(mockAddEventListener).toHaveBeenCalledWith(
      Trigger.Submit,
      expect.any(Function),
    );
  });

  test('init scope', () => {
    // Both e load events should be triggered
    elb('walker init');
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
    elb('walker init', elem);
    expect(mockDataLayer).not.toHaveBeenCalledWith(
      expect.objectContaining({
        event: 'e all',
      }),
    );

    expect(mockDataLayer).toHaveBeenCalledWith(
      expect.objectContaining({
        event: 'e init',
      }),
    );
  });

  test('load page view', () => {
    document.body.setAttribute('data-elb-page', 'foo:bar');
    document.body.setAttribute('data-elbcontext', 'baz:qux');
    elb('walker run');
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

  test('load view location and referrer', () => {
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
    jest.clearAllMocks();
    elb('walker run');

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

    elb('page click', { foo: 'bar' });
    expect(mockDataLayer).toHaveBeenCalledWith(
      expect.objectContaining({
        event: 'page click',
        data: {
          id: '/p', // Added automatically
          foo: 'bar',
        },
      }),
    );

    window.location = location;
    document.title = title;
    Object.defineProperty(document, 'referrer', {
      value: referrer,
      writable: true,
    });
  });

  test('load readyState loading', () => {
    const readyState = document.readyState;
    Object.defineProperty(document, 'readyState', {
      value: 'loading',
      writable: true,
    });

    // New page run in loading state
    jest.clearAllMocks();
    elb('walker run');

    expect(mockDataLayer).toHaveBeenCalledTimes(0);

    (events.DOMContentLoaded as () => void)();

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

  test('click', () => {
    const elem = document.getElementById('click');

    // Simulate submit event
    (events.click as (e: unknown) => void)({ target: elem } as Event);

    expect(mockDataLayer).toHaveBeenLastCalledWith(
      expect.objectContaining({
        event: 'e click',
        trigger: Trigger.Click,
      }),
    );
  });

  test('submit', () => {
    // https://developer.mozilla.org/en-US/docs/Web/API/HTMLFormElement/submit_event
    const form = document.getElementById('form');

    // Simulate submit event
    (events.submit as (e: unknown) => void)({ target: form } as Event);

    expect(mockDataLayer).toHaveBeenLastCalledWith(
      expect.objectContaining({
        event: 'form submit',
        trigger: Trigger.Submit,
      }),
    );
  });

  test('hover', () => {
    jest.resetAllMocks();

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
    expect(mockDataLayer).toHaveBeenCalledTimes(3);
  });

  test('wait', () => {
    expect(setTimeout).toHaveBeenLastCalledWith(expect.any(Function), 4000);

    expect(mockDataLayer).not.toHaveBeenCalledWith(
      expect.objectContaining({
        trigger: Trigger.Wait,
      }),
    );

    jest.clearAllMocks();

    // Simulate timer, expected a 4sec wait
    jest.advanceTimersByTime(2000);

    expect(mockDataLayer).not.toHaveBeenCalled();

    // Simulate timer to total waiting time of 4000ms
    jest.advanceTimersByTime(2000);

    expect(mockDataLayer).toHaveBeenLastCalledWith(
      expect.objectContaining({
        event: 'timer alarm',
        trigger: Trigger.Wait,
        data: { its: 'time' },
      }),
    );
  });

  test('pulse', () => {
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

    expect(mockDataLayer).toHaveBeenLastCalledWith(
      expect.objectContaining({
        event: 'pulse beat',
        trigger: Trigger.Pulse,
      }),
    );

    jest.clearAllMocks();
    expect(mockDataLayer).not.toHaveBeenCalled();
    jest.advanceTimersByTime(5000);

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
    expect(mockDataLayer).toHaveBeenCalled();
  });

  test('scroll', () => {
    // New instance without cached scroll listener
    w.elbLayer = [];
    const Walkerjs = jest.requireActual('../').default;
    Walkerjs({ default: true });

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

    expect(mockDataLayer).toHaveBeenCalledWith(
      expect.objectContaining({
        event: 'scroll 80percent',
        trigger: Trigger.Scroll,
      }),
    );

    window.innerHeight = innerHeight;
  });

  test('visible', () => {
    // Mock Intersection Observer
    const mockObserve = jest.fn();
    const mockUnobserve = jest.fn();
    const mockDisconnect = jest.fn();
    w.IntersectionObserver = jest.fn(
      () =>
        ({
          observe: mockObserve,
          unobserve: mockUnobserve,
          disconnect: mockDisconnect,
        } as unknown as IntersectionObserver),
    );

    // mock isVisible to return true
    jest.mock('@elbwalker/utils', () => ({
      ...jest.requireActual('@elbwalker/utils'),
      isVisible: () => true,
    }));

    jest.clearAllMocks();
    jest.spyOn(global, 'setTimeout');
    jest.spyOn(global, 'clearTimeout');

    w.elbLayer = [];
    const Elbwalker = jest.requireActual('../').default;
    Elbwalker({ default: true });

    const target = document.getElementById('visible');
    const [observer] = (window.IntersectionObserver as jest.Mock).mock.calls[0];

    // Check for disconnection to prevent double listens
    expect(mockDisconnect).toHaveBeenCalledWith();

    jest.clearAllMocks();
    expect(setTimeout).toHaveBeenCalledTimes(0);

    // Simulate scroll event
    observer([
      {
        target,
        isIntersecting: false,
        intersectionRatio: 1,
      },
      {
        target,
        isIntersecting: false,
        intersectionRatio: 0.2,
      },
    ]);

    // Called for getting into viewport
    expect(setTimeout).toHaveBeenCalledTimes(1);
    // Called for getting out of viewport
    expect(clearTimeout).toHaveBeenCalledTimes(1);

    // Completely in viewport
    observer([
      {
        target,
        isIntersecting: false,
        intersectionRatio: 1,
      },
    ]);

    jest.advanceTimersByTime(1000);

    expect(mockDataLayer).toHaveBeenCalledWith(
      expect.objectContaining({
        event: 'visible impression',
        trigger: Trigger.Visible,
      }),
    );

    // Stop watching
    expect(mockUnobserve).toHaveBeenCalled();
  });
});
