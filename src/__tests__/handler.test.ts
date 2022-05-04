require('intersection-observer');

import fs from 'fs';
import { initHandler } from '../lib/handler';
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
  w.elbLayer = w.elbLayer || [];
  w.elbLayer.push = mockFn;
  jest.clearAllMocks();

  events = {};
  document.addEventListener = mockAddEventListener.mockImplementation(
    (event, callback) => {
      events[event] = callback;
    },
  );
});

describe('handler', () => {
  test('load view', () => {
    initHandler();

    expect(mockFn).toHaveBeenNthCalledWith(
      1,
      'page view',
      { domain: 'localhost', id: '/', title: '' },
      'load',
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

    initHandler();

    expect(mockFn).toHaveBeenNthCalledWith(
      1,
      'page view',
      {
        domain: 'www.elbwalker.com',
        id: '/p',
        search: '?q=Analytics',
        hash: '#hash',
        title: 'Title',
      },
      'load',
    );

    expect(mockFn).toHaveBeenNthCalledWith(
      2,
      'e a',
      {
        k: 'v',
      },
      'load',
      [],
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

    elbwalker.push('walker run');

    expect(mockFn).toHaveBeenCalledTimes(0);

    (events.DOMContentLoaded as Function)();

    expect(mockFn).toHaveBeenNthCalledWith(
      1,
      'page view',
      { domain: 'localhost', id: '/', title: '' },
      'load',
    );

    Object.defineProperty(document, 'readyState', {
      value: readyState,
      writable: true,
    });
  });

  test('submit', () => {
    // https://developer.mozilla.org/en-US/docs/Web/API/HTMLFormElement/submit_event
    const form = document.getElementById('form');

    initHandler();
    expect(mockAddEventListener).toHaveBeenCalledWith(
      'submit',
      expect.any(Function),
    );

    // Simulate submit event
    (events.submit as Function)({ target: form } as Event);

    expect(mockFn).toHaveBeenLastCalledWith('form submit', {}, 'submit', []);
  });

  test.skip('wait', () => {
    // @TODO it's very stupid to write your own tests. Change the time 4000 ...

    initHandler();

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
