import Elbwalker from '../elbwalker';
import { Trigger } from '../lib/constants';
import { IElbwalker } from '../types';
import fs from 'fs';

const w = window;
let elbwalker: IElbwalker.Function;

const mockFn = jest.fn(); //.mockImplementation(console.log);
const mockAddEventListener = jest.fn(); //.mockImplementation(console.log);

let events: Record<string, EventListenerOrEventListenerObject> = {};
const html: string = fs
  .readFileSync(__dirname + '/html/trigger.html')
  .toString();

describe('Trigger', () => {
  beforeEach(() => {
    // reset DOM with event listeners etc.
    document.body = document.body.cloneNode() as HTMLElement;
    document.body.innerHTML = html;

    jest.clearAllMocks();
    jest.resetModules();
    jest.useFakeTimers();
    jest.spyOn(global, 'setTimeout');
    jest.spyOn(global, 'setInterval');
    w.dataLayer = [];
    w.dataLayer.push = mockFn;
    w.elbLayer = undefined as unknown as IElbwalker.ElbLayer;

    events = {};
    document.addEventListener = mockAddEventListener.mockImplementation(
      (event, callback) => {
        events[event] = callback;
      },
    );

    elbwalker = Elbwalker({ default: true });
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
    jest.clearAllMocks();

    // Both e load events should be triggered
    elbwalker.push('walker init');
    expect(mockFn).toHaveBeenCalledWith(
      expect.objectContaining({
        event: 'e all',
      }),
    );
    expect(mockFn).toHaveBeenCalledWith(
      expect.objectContaining({
        event: 'e init',
      }),
    );

    jest.clearAllMocks();
    const elem = document.querySelector('#init div')!;

    // Only the e init event should be triggered
    elbwalker.push('walker init', elem);
    expect(mockFn).not.toHaveBeenCalledWith(
      expect.objectContaining({
        event: 'e all',
      }),
    );

    expect(mockFn).toHaveBeenCalledWith(
      expect.objectContaining({
        event: 'e init',
      }),
    );
  });

  test('load page view', () => {
    expect(mockFn).toHaveBeenCalledWith(
      expect.objectContaining({
        event: 'page view',
        data: { domain: 'localhost', id: '/', title: '', referrer: '' },
        trigger: Trigger.Load,
      }),
    );
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
      value: 'https://docs.elbwalker.com',
      writable: true,
    });

    // New page run on new page
    jest.clearAllMocks();
    elbwalker.push('walker run');

    expect(mockFn).toHaveBeenCalledWith(
      expect.objectContaining({
        event: 'page view',
        data: {
          domain: 'www.elbwalker.com',
          id: '/p',
          search: '?q=Analytics',
          hash: '#hash',
          title: 'Title',
          referrer: 'https://docs.elbwalker.com',
        },
        trigger: Trigger.Load,
      }),
    );

    elbwalker.push('page click', { foo: 'bar' });
    expect(mockFn).toHaveBeenCalledWith(
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
    elbwalker.push('walker run');

    expect(mockFn).toHaveBeenCalledTimes(0);

    (events.DOMContentLoaded as Function)();

    expect(mockFn).toHaveBeenNthCalledWith(
      1,
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
    (events.click as Function)({ target: elem } as Event);

    expect(mockFn).toHaveBeenLastCalledWith(
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
    (events.submit as Function)({ target: form } as Event);

    expect(mockFn).toHaveBeenLastCalledWith(
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
    expect(mockFn).not.toHaveBeenCalled();
    expect(mockFn).toHaveBeenCalledTimes(0);

    // Simulate hover event
    elem.dispatchEvent(hoverEvent);
    expect(mockFn).toHaveBeenCalledTimes(1);

    expect(mockFn).toHaveBeenLastCalledWith(
      expect.objectContaining({
        event: 'mouse hover',
        trigger: Trigger.Hover,
      }),
    );

    // Fire multiple hover event
    elem.dispatchEvent(hoverEvent);
    elem.dispatchEvent(hoverEvent);
    expect(mockFn).toHaveBeenCalledTimes(3);
  });

  test('wait', () => {
    expect(setTimeout).toHaveBeenLastCalledWith(expect.any(Function), 4000);

    expect(mockFn).not.toHaveBeenCalledWith(
      expect.objectContaining({
        trigger: Trigger.Wait,
      }),
    );

    jest.clearAllMocks();

    // Simulate timer, expected a 4sec wait
    jest.advanceTimersByTime(2000);

    expect(mockFn).not.toHaveBeenCalled();

    // Simulate timer to total waiting time of 4000ms
    jest.advanceTimersByTime(2000);

    expect(mockFn).toHaveBeenLastCalledWith(
      expect.objectContaining({
        event: 'timer alarm',
        trigger: Trigger.Wait,
        data: { its: 'time' },
      }),
    );
  });

  test('pulse', () => {
    expect(setInterval).toHaveBeenCalledWith(expect.any(Function), 5000);

    expect(mockFn).not.toHaveBeenCalledWith(
      expect.objectContaining({
        trigger: Trigger.Pulse,
      }),
    );

    jest.clearAllMocks();

    jest.advanceTimersByTime(2500);

    expect(mockFn).not.toHaveBeenCalled();

    jest.advanceTimersByTime(2500);

    expect(mockFn).toHaveBeenLastCalledWith(
      expect.objectContaining({
        event: 'pulse beat',
        trigger: Trigger.Pulse,
      }),
    );

    jest.clearAllMocks();
    expect(mockFn).not.toHaveBeenCalled();
    jest.advanceTimersByTime(5000);

    expect(mockFn).toHaveBeenLastCalledWith(
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
    expect(mockFn).not.toHaveBeenCalled();

    Object.defineProperty(document, 'hidden', {
      value: false,
      writable: true,
    });

    jest.clearAllMocks();
    jest.advanceTimersByTime(5000);
    expect(mockFn).toHaveBeenCalled();
  });

  test('scroll', () => {
    // New instance without cached scrollIstener
    w.elbLayer = [];
    const Elbwalker = jest.requireActual('../elbwalker').default;
    elbwalker = Elbwalker({ default: true });

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

    // Simulate scroll event
    (events.scroll as Function)({} as Event);

    expect(mockFn).not.toHaveBeenCalled();

    // Scroll to 50% of elem in viewport
    window.scrollY = 115;

    // Skip throttling timer
    jest.advanceTimersByTime(1000);
    (events.scroll as Function)({} as Event);

    // Not 80% in viewport yet
    expect(mockFn).not.toHaveBeenCalled();

    // Scroll to 50% of elem in viewport
    window.scrollY = 170;

    // Skip throttling timer
    jest.advanceTimersByTime(1000);
    (events.scroll as Function)({} as Event);

    expect(mockFn).toHaveBeenCalledWith(
      expect.objectContaining({
        event: 'scoll 80percent',
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
        }) as unknown as IntersectionObserver,
    );

    // mock isVisible to return true
    jest.mock('../lib/utils', () => ({
      ...jest.requireActual('../lib/utils'),
      isVisible: () => true,
    }));

    jest.clearAllMocks();
    jest.spyOn(global, 'setTimeout');
    jest.spyOn(global, 'clearTimeout');

    w.elbLayer = [];
    const Elbwalker = jest.requireActual('../elbwalker').default;
    elbwalker = Elbwalker({ default: true });

    const target = document.getElementById('visible');
    const [observer] = (window.IntersectionObserver as jest.Mock).mock.calls[0];

    // Check for disconnection to prevent double listens
    expect(mockDisconnect).toBeCalled();

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

    expect(mockFn).toHaveBeenCalledWith(
      expect.objectContaining({
        event: 'visible impression',
        trigger: Trigger.Visible,
      }),
    );

    // Stop watching
    expect(mockUnobserve).toHaveBeenCalled();
  });
});
