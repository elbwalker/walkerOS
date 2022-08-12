require('intersection-observer');

import fs from 'fs';
import { AnyObject } from '@elbwalker/types';
import elbwalker from '../elbwalker';
const w = window;

jest.useFakeTimers();
jest.spyOn(global, 'setTimeout');

const mockFn = jest.fn(); //.mockImplementation(console.log);
const mockAddEventListener = jest.fn(); //.mockImplementation(console.log);

let events: AnyObject = {};
const html: string = fs
  .readFileSync(__dirname + '/html/handler.html')
  .toString();

beforeEach(() => {
  document.body = document.body.cloneNode() as HTMLElement;
  document.body.innerHTML = html;
  w.dataLayer = w.dataLayer || [];
  w.dataLayer.push = mockFn;
  jest.clearAllMocks();

  events = {};
  document.addEventListener = mockAddEventListener.mockImplementation(
    (event, callback) => {
      events[event] = callback;
    },
  );

  elbwalker.go();
});

describe('handler', () => {
  test('init', () => {
    expect(mockAddEventListener).toHaveBeenCalledWith(
      'click',
      expect.any(Function),
    );
    expect(mockAddEventListener).toHaveBeenCalledWith(
      'submit',
      expect.any(Function),
    );
  });

  test('load view', () => {
    expect(mockFn).toHaveBeenCalledWith(
      expect.objectContaining({
        event: 'page view',
        data: { domain: 'localhost', id: '/', title: '' },
        trigger: 'load',
      }),
    );
  });

  test('load view location', () => {
    const location = document.location;
    const title = document.title;

    document.title = 'Title';
    Object.defineProperty(window, 'location', {
      value: new URL('https://www.elbwalker.com/p?q=Analytics#hash'),
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
        },
        trigger: 'load',
      }),
    );

    expect(mockFn).toHaveBeenCalledWith(
      expect.objectContaining({
        event: 'e a',
        data: {
          k: 'v',
        },
        trigger: 'load',
      }),
    );

    window.location = location;
    document.title = title;
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
        trigger: 'load',
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
        trigger: 'click',
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
        trigger: 'submit',
      }),
    );
  });

  test('hover', () => {
    const elem = document.getElementById('hover') as Element;
    const hoverEvent = new MouseEvent('mouseenter', {
      view: window,
      bubbles: true,
      cancelable: true,
    });

    // Fire hover event
    elem.dispatchEvent(hoverEvent);

    expect(mockFn).toHaveBeenLastCalledWith(
      expect.objectContaining({
        event: 'mouse hover',
        trigger: 'hover',
      }),
    );
  });

  test.skip('wait', () => {
    // @TODO it's very stupid to write your own tests. Change the time 4000 ...

    expect(setTimeout).toHaveBeenLastCalledWith(expect.any(Function), 4000);
    expect(mockFn).not.toHaveBeenLastCalledWith(
      'timer alarm',
      { its: 'time' },
      'wait',
      [],
    );

    // Simulate timer
    jest.runAllTimers();

    expect(mockFn).toHaveBeenLastCalledWith(
      'timer alarm',
      { its: 'time' },
      'wait',
      [],
    );
  });
});
