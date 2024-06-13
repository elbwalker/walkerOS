import { elb, Walkerjs } from '..';
import { mockDataLayer } from '@elbwalker/jest/web.setup';
import type { WebClient } from '..';
import type { Data } from '@elbwalker/types';
import fs from 'fs';

describe('Walkerjs', () => {
  const w = window;
  const version = { client: expect.any(String), tagging: expect.any(Number) };

  let walkerjs: WebClient.Instance;

  beforeEach(() => {
    jest.useFakeTimers();
    global.performance.getEntriesByType = jest
      .fn()
      .mockReturnValue([{ type: 'navigate' }]);

    walkerjs = Walkerjs({
      default: true,
      consent: { test: true },
      pageview: false,
      session: false,
    });
  });

  test('go', () => {
    w.elbLayer = undefined as unknown as WebClient.ElbLayer;
    expect(window.elbLayer).toBeUndefined();
    const instance = Walkerjs();
    expect(instance.config.elbLayer).toBeDefined();
  });

  test('assign to window', () => {
    const w = window as unknown as Record<string, unknown>;
    expect(window.elb).toBeUndefined();
    expect(window.walkerjs).toBeUndefined();
    const instance = Walkerjs({
      elb: 'foo',
      instance: 'bar',
    });
    expect(w.foo).toBe(elb);
    expect(w.bar).toBe(instance);
  });

  test('push empty', () => {
    (walkerjs as unknown as string[]).push();
    elb('');
    elb('entity');
    expect(mockDataLayer).toHaveBeenCalledTimes(0);
  });

  test('push regular', () => {
    elb('walker run');

    elb('entity action');
    elb('entity action', { foo: 'bar' });

    expect(mockDataLayer).toHaveBeenNthCalledWith(1, {
      event: 'entity action',
      data: expect.any(Object),
      context: {},
      custom: {},
      globals: {},
      user: {},
      nested: [],
      consent: { test: true },
      id: expect.any(String),
      trigger: '',
      entity: 'entity',
      action: 'action',
      timestamp: expect.any(Number),
      timing: expect.any(Number),
      group: expect.any(String),
      count: 1,
      version,
      source: {
        type: 'web',
        id: 'http://localhost/',
        previous_id: '',
      },
    });

    expect(mockDataLayer).toHaveBeenNthCalledWith(2, {
      event: 'entity action',
      data: { foo: 'bar' },
      context: {},
      custom: {},
      globals: {},
      user: {},
      nested: [],
      consent: { test: true },
      id: expect.any(String),
      trigger: '',
      entity: 'entity',
      action: 'action',
      timestamp: expect.any(Number),
      timing: expect.any(Number),
      group: expect.any(String),
      count: 2,
      version,
      source: {
        type: 'web',
        id: 'http://localhost/',
        previous_id: '',
      },
    });
  });

  test('push event', () => {
    (walkerjs as unknown as string[]).push();
    elb({ event: 'e a', timing: 42 });
    expect(mockDataLayer).toHaveBeenCalledWith(
      expect.objectContaining({ event: 'e a', timing: 42, data: {} }),
    );
  });

  test('run option', () => {
    walkerjs = Walkerjs({ run: false });
    expect(walkerjs.allowed).toBeFalsy();

    walkerjs = Walkerjs({ run: true });
    expect(walkerjs.allowed).toBeTruthy();
  });

  test('dataLayer option', () => {
    window.dataLayer = undefined;
    walkerjs = Walkerjs({ dataLayer: false });
    expect(window.dataLayer).toBeUndefined();

    walkerjs = Walkerjs({ dataLayer: true });
    expect(window.dataLayer).toBeDefined();
  });

  test('default option', () => {
    window.dataLayer = undefined;
    walkerjs = Walkerjs({ default: false });
    expect(window.dataLayer).toBeUndefined();
    expect(walkerjs.allowed).toBeFalsy();

    walkerjs = Walkerjs({ default: true });
    expect(window.dataLayer).toBeDefined();
    expect(walkerjs.allowed).toBeTruthy();
  });

  test('globals properties', () => {
    const html: string = fs
      .readFileSync(__dirname + '/html/globals.html')
      .toString();
    document.body.innerHTML = html;

    jest.clearAllMocks(); // skip previous init
    w.elbLayer = [];
    walkerjs = Walkerjs({
      default: true,
      pageview: false,
      session: false,
      globalsStatic: { out_of: 'override', static: 'value' },
    });

    expect(mockDataLayer).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        event: 'entity action',
        data: { foo: 'bar' },
        globals: { out_of: 'scope', static: 'value' },
      }),
    );

    jest.clearAllMocks(); // skip previous init
    elb('walker run');
    expect(mockDataLayer).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        event: 'entity action',
        data: { foo: 'bar' },
        globals: { out_of: 'scope', static: 'value' },
      }),
    );
  });

  test('group ids', () => {
    elb('entity action');
    elb('entity action');
    const groupId = mockDataLayer.mock.calls[0][0].group;
    expect(mockDataLayer.mock.calls[1][0].group).toEqual(groupId);

    // Start a new initialization with a new group ip
    elb('walker run');
    elb('entity action');
    expect(mockDataLayer.mock.calls[2][0].group).not.toEqual(groupId); // page view
  });

  test('source', () => {
    const location = document.location;
    const referrer = document.referrer;

    const newPageId = 'https://www.elbwalker.com/source_id';
    const newPageReferrer = 'https://another.elbwalker.com';
    Object.defineProperty(window, 'location', {
      value: new URL(newPageId),
      writable: true,
    });
    Object.defineProperty(document, 'referrer', {
      value: newPageReferrer,
      writable: true,
    });

    elb('entity source');
    expect(mockDataLayer).toHaveBeenLastCalledWith(
      expect.objectContaining({
        event: 'entity source',
        source: {
          type: 'web',
          id: newPageId,
          previous_id: newPageReferrer,
        },
      }),
    );

    window.location = location;
    Object.defineProperty(document, 'referrer', {
      value: referrer,
      writable: true,
    });
  });

  test('timing', () => {
    jest.clearAllMocks();
    jest.advanceTimersByTime(2500); // 2.5 sec load time
    walkerjs = Walkerjs({ default: true });

    expect(mockDataLayer.mock.calls[0][0].timing).toEqual(2.5);

    jest.advanceTimersByTime(1000); // 1 sec to new run
    elb('walker run');
    expect(mockDataLayer).toHaveBeenLastCalledWith(
      expect.objectContaining({
        timing: 0,
      }),
    ); // Start from 0 not 3.5

    jest.advanceTimersByTime(5000); // wait 5 sec
    elb('e a');
    expect(mockDataLayer).toHaveBeenLastCalledWith(
      expect.objectContaining({
        timing: 5,
      }),
    );
  });

  test('Element parameter', () => {
    document.body.innerHTML = `
      <div data-elbcontext="c:o">
        <div id="e" data-elb="e" data-elbaction="load">
          <p data-elb-e="k:v"></p>
        </div>
      </div>
    `;
    const elem = document.getElementById('e') as HTMLElement;

    elb('e custom', elem, 'custom');

    expect(mockDataLayer).toHaveBeenCalledWith(
      expect.objectContaining({
        event: 'e custom',
        trigger: 'custom',
        data: { k: 'v' },
        context: { c: ['o', 0] },
      }),
    );

    elb('e context', { a: 1 }, 'custom', elem);

    expect(mockDataLayer).toHaveBeenCalledWith(
      expect.objectContaining({
        event: 'e context',
        trigger: 'custom',
        data: { a: 1 },
        context: { c: ['o', 0] },
      }),
    );
  });

  // @TODO move to somewhere else
  test('Contract', () => {
    const contract: Data.Contract = {
      version: '',
      globals: {
        pagegroup: {
          type: 'string',
          values: [2, '2', []],
        },
        pagetype: {},
      },
      context: {},
      entities: {},
    };

    expect(contract).toBeDefined();
  });
});
