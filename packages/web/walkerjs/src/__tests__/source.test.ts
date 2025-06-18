import type { Data } from '@elbwalker/types';
import type { Elb, SourceWalkerjs } from '../';
import { mockDataLayer } from '@walkerOS/jest/web.setup';
import { Walkerjs, createSourceWalkerjs } from '../';
import fs from 'fs';

describe('Walkerjs', () => {
  const w = window;
  const version = { source: expect.any(String), tagging: expect.any(Number) };

  let elb: Elb.Fn;
  let walkerjs: SourceWalkerjs.Instance;

  beforeEach(() => {
    global.performance.getEntriesByType = jest
      .fn()
      .mockReturnValue([{ type: 'navigate' }]);

    const { elb: elbFn, instance } = createSourceWalkerjs({
      default: true,
      consent: { test: true },
      pageview: false,
      session: false,
    });
    elb = elbFn;
    walkerjs = instance;
  });

  test('version equals package.json version', () => {
    const packageJsonVersion = jest.requireActual('../../package.json').version;

    walkerjs = Walkerjs();
    expect(walkerjs.version).toStrictEqual(packageJsonVersion);
  });

  test('go', () => {
    w.elbLayer = undefined as unknown as Elb.Layer;
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
    expect(typeof w.foo).toBe('function');
    expect(w.bar).toBe(instance);
  });

  test('push empty', () => {
    (walkerjs as unknown as string[]).push();
    elb('');
    elb('entity');
    expect(mockDataLayer).toHaveBeenCalledTimes(0);
  });

  test('push regular', async () => {
    elb('walker run');

    elb('entity action');
    await elb('entity action', { foo: 'bar' });

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

  test('push event', async () => {
    (walkerjs as unknown as string[]).push();
    await elb({ event: 'e a', timing: 42 });
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

  test('globalsStatic', async () => {
    const html: string = fs
      .readFileSync(__dirname + '/html/walker.html')
      .toString();
    document.body.innerHTML = html;

    jest.clearAllMocks(); // skip previous init
    w.elbLayer = [];
    const { elb } = createSourceWalkerjs({
      default: true,
      pageview: false,
      session: false,
      globalsStatic: { be: 'water', random: 'value' },
    });

    await jest.runAllTimersAsync();
    expect(mockDataLayer).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        globals: { be: 'mindful', its: 'everywhere', random: 'value' },
      }),
    );

    jest.clearAllMocks(); // skip previous init
    await elb('walker run');
    expect(mockDataLayer).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        globals: { be: 'mindful', its: 'everywhere', random: 'value' },
      }),
    );
  });

  test('group ids', async () => {
    elb('entity action');
    await elb('entity action');
    const groupId = mockDataLayer.mock.calls[0][0].group;
    expect(mockDataLayer.mock.calls[1][0].group).toEqual(groupId);

    // Start a new initialization with a new group ip
    elb('walker run');
    await elb('entity action');
    expect(mockDataLayer.mock.calls[2][0].group).not.toEqual(groupId); // page view
  });

  test('source', async () => {
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

    await elb('entity source');
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

  test('timing', async () => {
    jest.clearAllMocks();
    jest.advanceTimersByTime(2500); // 2.5 sec load time
    const { elb } = createSourceWalkerjs({ default: true });

    await jest.runAllTimersAsync();
    expect(mockDataLayer.mock.calls[0][0].timing).toEqual(2.5);

    jest.advanceTimersByTime(1000); // 1 sec to new run
    await elb('walker run');
    expect(mockDataLayer).toHaveBeenLastCalledWith(
      expect.objectContaining({
        timing: 0,
      }),
    ); // Start from 0 not 3.5

    jest.advanceTimersByTime(5000); // wait 5 sec
    await elb('e action');
    expect(mockDataLayer).toHaveBeenLastCalledWith(
      expect.objectContaining({
        timing: 5,
      }),
    );
  });

  test('Element parameter', async () => {
    document.body.innerHTML = `
      <div data-elbcontext="c:o">
        <div id="e" data-elb="e" data-elbaction="load">
          <p data-elb-e="k:v"></p>
        </div>
      </div>
    `;
    const elem = document.getElementById('e') as HTMLElement;

    await elb('e custom', elem, 'custom');
    expect(mockDataLayer).toHaveBeenCalledWith(
      expect.objectContaining({
        event: 'e custom',
        trigger: 'custom',
        data: { k: 'v' },
        context: { c: ['o', 0] },
      }),
    );

    await elb('e context', { a: 1 }, 'custom', elem);

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
