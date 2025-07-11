import type { Data } from '@walkerOS/core';
import type { Elb, WebCollector } from '../';
import { mockDataLayer } from '@walkerOS/jest/web.setup';
import { webCollector, createWebCollector } from '../';
import fs from 'fs';

describe('webCollector', () => {
  const w = window;
  const version = { source: expect.any(String), tagging: expect.any(Number) };

  let elb: Elb.Fn;
  let walkerjs: WebCollector.Collector;

  beforeEach(() => {
    global.performance.getEntriesByType = jest
      .fn()
      .mockReturnValue([{ type: 'navigate' }]);

    const { elb: elbFn, collector } = createWebCollector({
      default: true,
      consent: { test: true },
      pageview: false,
      session: false,
    });
    elb = elbFn;
    walkerjs = collector;
  });

  test('version equals package.json version', () => {
    const packageJsonVersion = jest.requireActual('../../package.json').version;

    walkerjs = webCollector();
    expect(walkerjs.version).toStrictEqual(packageJsonVersion);
  });

  test('go', () => {
    w.elbLayer = undefined as unknown as Elb.Layer;
    expect(window.elbLayer).toBeUndefined();
    const collector = webCollector();
    expect(collector.config.elbLayer).toBeDefined();
  });

  test('assign to window', () => {
    const w = window as unknown as Record<string, unknown>;
    expect(window.elb).toBeUndefined();
    expect(window.walkerjs).toBeUndefined();
    const collector = webCollector({
      elb: 'foo',
      name: 'bar',
    });
    expect(typeof w.foo).toBe('function');
    expect(w.bar).toBe(collector);
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
    walkerjs = webCollector({ run: false });
    expect(walkerjs.allowed).toBeFalsy();

    walkerjs = webCollector({ run: true });
    expect(walkerjs.allowed).toBeTruthy();
  });

  test('dataLayer option', () => {
    window.dataLayer = undefined;
    walkerjs = webCollector({ dataLayer: false });
    expect(window.dataLayer).toBeUndefined();

    walkerjs = webCollector({ dataLayer: true });
    expect(window.dataLayer).toBeDefined();
  });

  test('default option', () => {
    window.dataLayer = undefined;
    walkerjs = webCollector({ default: false });
    expect(window.dataLayer).toBeUndefined();
    expect(walkerjs.allowed).toBeFalsy();

    walkerjs = webCollector({ default: true });
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
    const { elb } = createWebCollector({
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

    Object.defineProperty(window, 'location', {
      value: location,
      writable: true,
    });
    Object.defineProperty(document, 'referrer', {
      value: referrer,
      writable: true,
    });
  });

  test('timing', async () => {
    jest.clearAllMocks();
    jest.advanceTimersByTime(2500); // 2.5 sec load time
    const { elb } = createWebCollector({ default: true });

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

  test('listeners disabled', () => {
    // Mock addEventListener to track calls
    const originalAddEventListener = document.addEventListener;
    const addEventListenerSpy = jest.fn();
    document.addEventListener = addEventListenerSpy;

    // Mock IntersectionObserver
    const mockObserver = {
      observe: jest.fn(),
      disconnect: jest.fn(),
      unobserve: jest.fn(),
    };
    const IntersectionObserverSpy = jest.fn(
      () => mockObserver,
    ) as unknown as typeof IntersectionObserver;
    window.IntersectionObserver = IntersectionObserverSpy;

    // Mock setInterval and setTimeout
    const setIntervalSpy = jest.spyOn(global, 'setInterval');
    const setTimeoutSpy = jest.spyOn(global, 'setTimeout');

    try {
      // Create collector with listeners disabled
      const collector = webCollector({
        listeners: false,
        run: true,
        pageview: true,
      });

      // Run the collector to trigger potential listener registration
      collector.push('walker run');

      // Verify no event listeners were registered
      expect(addEventListenerSpy).not.toHaveBeenCalled();

      // Verify no IntersectionObserver was created
      expect(IntersectionObserverSpy).not.toHaveBeenCalled();

      // Verify no timers were set (excluding Jest's own timers)
      expect(setIntervalSpy).not.toHaveBeenCalled();
      expect(setTimeoutSpy).not.toHaveBeenCalled();

      // Verify collector still works programmatically
      expect(collector.push).toBeDefined();
      expect(typeof collector.push).toBe('function');
      expect(collector.config.listeners).toBe(false);
    } finally {
      // Restore original functions
      document.addEventListener = originalAddEventListener;
      setIntervalSpy.mockRestore();
      setTimeoutSpy.mockRestore();
    }
  });

  test('scope', () => {
    document.body.innerHTML = `
      <div data-elb="ignore" data-elbaction="load:me">
        <div data-elbglobals="ignore:me"></div>
      </div>
      <div id="scoped" data-elb="scoped" data-elbaction="load"></div>
    `;

    const scopeContainer = document.getElementById('scoped') as HTMLElement;
    const originalAddEventListener = scopeContainer.addEventListener;
    const addEventListenerSpy = jest.fn();
    scopeContainer.addEventListener = addEventListenerSpy;

    try {
      // Create collector with scoped configuration
      const collector = webCollector({
        scope: scopeContainer,
        run: true,
        pageview: false,
        listeners: true,
      });

      expect(collector.globals).toStrictEqual({});

      // Verify event listeners were attached to the scope element, not document
      expect(addEventListenerSpy).toHaveBeenCalledWith(
        'click',
        expect.any(Function),
      );
      expect(addEventListenerSpy).toHaveBeenCalledWith(
        'submit',
        expect.any(Function),
      );

      // Verify collector respects the scope
      expect(collector.config.scope).toBe(scopeContainer);

      // Test that getAllEvents respects scope
      const events = collector.getAllEvents(scopeContainer, 'data-elb');
      expect(events).toHaveLength(1);
      expect(events[0].entity).toBe('scoped');
    } finally {
      // Restore original function and cleanup
      scopeContainer.addEventListener = originalAddEventListener;
      document.body.removeChild(scopeContainer);
    }
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
