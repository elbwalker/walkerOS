import type { WebCollector, DestinationWeb, Elb } from '../';
import type { WalkerOS } from '@walkerOS/core';
import { mockDataLayer } from '@walkerOS/jest/web.setup';
import { elb as elbOrg, webCollector, createWebCollector, elb } from '../';

describe('elbLayer', () => {
  const w = window;
  let walkerjs: WebCollector.Collector;

  const mockDestinationPush = jest.fn(); //.mockImplementation(console.log);
  const mockDestinationInit = jest.fn(); //.mockImplementation(console.log);
  const destination: DestinationWeb.Destination = {
    init: mockDestinationInit,
    push: mockDestinationPush,
    config: { init: true },
  };

  beforeEach(() => {});

  test('arguments and event pushes', async () => {
    walkerjs = webCollector({ default: true });
    elb('ingest argument', { a: 1 }, 'a', {}); // Push as arguments
    w.elbLayer.push('ingest event', { b: 2 }, 'e', []); // Push as event

    await jest.runAllTimersAsync();
    expect(mockDataLayer).toHaveBeenCalledWith(
      expect.objectContaining({
        event: 'ingest argument',
        data: { a: 1 },
        trigger: 'a',
        nested: [],
      }),
    );
    expect(mockDataLayer).toHaveBeenCalledWith(
      expect.objectContaining({
        event: 'ingest event',
        data: { b: 2 },
        trigger: 'e',
        nested: [],
      }),
    );
  });

  test('predefined stack without run', async () => {
    walkerjs = webCollector();
    elb('walker destination', destination);
    elb('entity action');
    await jest.runAllTimersAsync();
    expect(mockDestinationPush).not.toHaveBeenCalled();
  });

  test('walker push pre and post go', async () => {
    elb('e 1');
    elb('walker destination', destination);

    walkerjs = webCollector({ session: false });
    elb('e 2');
    elb('walker run');
    // auto call: elb('page view');
    elb('e 4');

    await jest.runAllTimersAsync();

    expect(mockDestinationPush).toHaveBeenCalledWith(
      expect.objectContaining({
        event: 'e 1',
        count: 1,
      }),
      expect.objectContaining({
        config: expect.any(Object),
      }),
    );

    expect(mockDestinationPush).toHaveBeenCalledWith(
      expect.objectContaining({
        event: 'e 2',
        count: 2,
      }),
      expect.objectContaining({
        config: expect.any(Object),
      }),
    );

    expect(mockDestinationPush).toHaveBeenCalledWith(
      expect.objectContaining({
        event: 'page view',
        count: 3,
      }),
      expect.objectContaining({
        config: expect.any(Object),
      }),
    );

    expect(mockDestinationPush).toHaveBeenCalledWith(
      expect.objectContaining({
        event: 'e 4',
        count: 4,
      }),
      expect.objectContaining({
        config: expect.any(Object),
      }),
    );
  });

  test('predefined stack with run', () => {
    w.elbLayer = [{ event: 'pre event' }];
    elb('pre argument');

    walkerjs = webCollector({ session: false, pageview: false });

    elb('walker destination', destination);
    elb('ingest argument', { a: 1 }); // Push as arguments
    elb({ event: 'event object' }); // Push as event
    w.elbLayer.push({ event: 'event push' });
    elb('walker run');

    expect(walkerjs.queue).toContainEqual(
      expect.objectContaining({ event: 'pre event' }),
    );
    expect(walkerjs.queue).toContainEqual(
      expect.objectContaining({ event: 'pre argument' }),
    );
    expect(walkerjs.queue).toContainEqual(
      expect.objectContaining({ event: 'ingest argument', data: { a: 1 } }),
    );
    expect(walkerjs.queue).toContainEqual(
      expect.objectContaining({ event: 'event object' }),
    );
    expect(walkerjs.queue).toContainEqual(
      expect.objectContaining({ event: 'event push' }),
    );
  });

  test('prioritize walker commands before run', async () => {
    walkerjs = webCollector({ session: false });

    (elb as () => void)();
    elb('event postponed');
    elb('walker destination', destination);
    elb('walker user', { id: 'userId' });
    elb('walker run');
    elb('event later');

    await jest.runAllTimersAsync();

    expect(mockDestinationPush).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        event: 'event postponed',
        user: { id: 'userId' },
      }),
      expect.objectContaining({
        config: expect.any(Object),
      }),
    );
    expect(mockDestinationPush).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        event: 'page view',
        user: { id: 'userId' },
      }),
      expect.objectContaining({
        config: expect.any(Object),
      }),
    );
    expect(mockDestinationPush).toHaveBeenNthCalledWith(
      3,
      expect.objectContaining({
        event: 'event later',
        user: { id: 'userId' },
      }),
      expect.objectContaining({
        config: expect.any(Object),
      }),
    );
  });

  test('elbLayer initialization', () => {
    w.elbLayer = undefined as unknown as Elb.Layer;

    walkerjs = webCollector();

    expect(w.elbLayer).toBeDefined();
  });

  test('config update', () => {
    const defaultConfig: WebCollector.Config = {
      default: false,
      dataLayer: false,
      dataLayerConfig: {},
      dryRun: false,
      elbLayer: expect.any(Array),
      globalsStatic: {},
      pageview: true,
      prefix: 'data-elb',
      run: false,
      session: { storage: false },
      sessionStatic: {},
      tagging: expect.any(Number),
      verbose: false,
    };

    const defaultState: WebCollector.State = {
      allowed: true,
      consent: {},
      config: defaultConfig,
      custom: {},
      count: expect.any(Number),
      destinations: expect.any(Object),
      globals: expect.any(Object),
      group: expect.any(String),
      hooks: {},
      on: {},
      queue: expect.any(Array),
      round: expect.any(Number),
      session: expect.objectContaining({ storage: false }),
      timing: expect.any(Number),
      user: { session: expect.any(String) },
      version: expect.any(String),
    };

    const defaultInterface: WebCollector.Collector = {
      push: expect.any(Function),
      getAllEvents: expect.any(Function),
      getEvents: expect.any(Function),
      getGlobals: expect.any(Function),
      sessionStart: expect.any(Function),
      ...defaultState,
    };

    walkerjs = webCollector();
    elb('walker run');

    expect(walkerjs).toStrictEqual(defaultInterface);

    let update: WalkerOS.Properties | Partial<WebCollector.Config> = {
      prefix: 'data-custom',
    };
    const config = { ...defaultConfig, ...update };
    elb('walker config', update);
    expect(walkerjs.config).toStrictEqual(expect.objectContaining(update)); // Partial test
    expect(walkerjs.config).toStrictEqual(config); // Full test

    // @TODO Add more tests for other config properties

    update = { pageview: false };
    elb('walker config', update);
    expect(walkerjs.config).toStrictEqual(expect.objectContaining(update));
  });

  test('custom elbLayer', async () => {
    w.dataLayer = [];
    const dataLayer = w.dataLayer as unknown[];
    const customLayer1: Elb.Layer = [];
    const customLayer2: Elb.Layer = [];
    const collector1 = webCollector({
      elbLayer: customLayer1,
      default: true,
      pageview: false,
    });
    const collector2 = webCollector({
      elbLayer: customLayer2,
      default: true,
      pageview: false,
    });

    const mockDest1 = jest.fn();
    const mockDest2 = jest.fn();
    customLayer1.push('walker destination', {
      config: {},
      push: mockDest1,
    });
    customLayer2.push('walker destination', {
      config: {},
      push: mockDest2,
    });

    await jest.runAllTimersAsync();
    // Regular session start calls to both
    expect(mockDest1).toHaveBeenCalledWith(
      expect.objectContaining({ event: 'session start' }),
      expect.objectContaining({
        config: expect.any(Object),
      }),
    );
    expect(mockDest2).toHaveBeenCalledTimes(1);
    jest.clearAllMocks();

    customLayer1.push('e a');
    await jest.runAllTimersAsync();
    expect(mockDest1).toHaveBeenCalled();
    expect(mockDest2).not.toHaveBeenCalled();

    jest.clearAllMocks();
    customLayer2.push('e a');
    await jest.runAllTimersAsync();
    expect(mockDest1).not.toHaveBeenCalled();
    expect(mockDest2).toHaveBeenCalled();

    jest.clearAllMocks();
    collector1.push('foo bar');
    await jest.runAllTimersAsync();
    expect(mockDest1).toHaveBeenCalled();
    expect(mockDest2).not.toHaveBeenCalled();

    jest.clearAllMocks();
    collector2.push('bar foo');
    await jest.runAllTimersAsync();
    expect(mockDest1).not.toHaveBeenCalled();
    expect(mockDest2).toHaveBeenCalled();

    const length = dataLayer.length;
    expect(dataLayer[length - 1]).toEqual(
      expect.objectContaining({
        event: 'bar foo',
      }),
    );
    expect(dataLayer[length - 2]).toEqual(
      expect.objectContaining({
        event: 'foo bar',
      }),
    );

    jest.clearAllMocks();
    document.body.innerHTML = `<div data-elb="e" data-elbaction="load"></div>`;
    collector1.push('walker run');
    collector2.push('walker run');
    await jest.runAllTimersAsync();
    expect(mockDest1).toHaveBeenCalledWith(
      expect.objectContaining({
        event: 'e load',
      }),
      expect.objectContaining({
        config: expect.any(Object),
      }),
    );
    expect(mockDest2).toHaveBeenCalledWith(
      expect.objectContaining({
        event: 'e load',
      }),
      expect.objectContaining({
        config: expect.any(Object),
      }),
    );
  });

  test('elbLayer push override', async () => {
    const layer: Elb.Layer = [];

    webCollector({ elbLayer: layer, pageview: false });
    layer.push('walker run'); // Overwrites push function
    layer.push('walker destination', destination, {
      init: true,
      settings: { a: 1 },
    });
    layer.push('e a');

    await jest.runAllTimersAsync();
    expect(mockDestinationPush).toHaveBeenCalledWith(
      expect.objectContaining({
        event: 'e a',
      }),
      expect.objectContaining({
        config: { init: true, settings: { a: 1 } },
      }),
    );
  });

  test('command order', async () => {
    const { collector } = createWebCollector();
    const pushSpy = jest.spyOn(collector, 'push');

    elb('walker run');
    await jest.runAllTimersAsync();

    // Arguments
    expect(w.elbLayer[0]).toStrictEqual(['walker run']);

    // Parameters
    expect(pushSpy).toHaveBeenCalledWith('walker user', expect.any(Object));
    expect(pushSpy).toHaveBeenCalledWith('session start', expect.any(Object));
  });

  test('custom push', async () => {
    elbOrg(
      'e 1', // event
      {}, // data
      '', // trigger
      {}, // context
      [], // nested
      { any: 'thing' }, // custom
    );

    const { elb } = createWebCollector({ default: true, pageview: false });

    await jest.runAllTimersAsync();
    expect(mockDataLayer).toHaveBeenCalledWith(
      expect.objectContaining({
        event: 'e 1',
        custom: { any: 'thing' },
      }),
    );

    await elb(
      'e 2', // event
      {}, // data
      '', // trigger
      {}, // context
      [], // nested
      { any: 'thing' }, // custom
    );
    expect(mockDataLayer).toHaveBeenCalledWith(
      expect.objectContaining({
        event: 'e 2',
        custom: { any: 'thing' },
      }),
    );
  });
});
