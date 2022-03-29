require('intersection-observer');

import { initHandler } from '../lib/handler';

jest.useFakeTimers();
jest.spyOn(global, 'setTimeout');
jest.mock('../elbwalker');

import fs from 'fs';
import { AnyObject } from '@elbwalker/types';
const mockFn = jest.fn(); //.mockImplementation(console.log);
const mockAddEventListener = jest.fn(); //.mockImplementation(console.log);
window.elbLayer = window.elbLayer || [];
window.elbLayer.push = mockFn;

const html: string = fs
  .readFileSync(__dirname + '/html/handler.html')
  .toString();

let events: AnyObject = {};

beforeEach(() => {
  document.body = document.body.cloneNode() as HTMLElement;
  document.body.innerHTML = html;

  events = {};
  document.addEventListener = mockAddEventListener.mockImplementation(
    (event, callback) => {
      events[event] = callback;
    },
  );

  mockFn.mockClear();
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

    initHandler();

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
