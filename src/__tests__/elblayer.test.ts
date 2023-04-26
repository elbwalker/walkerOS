import Elbwalker from '../elbwalker';
import { elb } from '../lib/utils';
import { IElbwalker, Walker, WebDestination } from '../types';

describe('ElbLayer', () => {
  const w = window;
  let elbwalker: IElbwalker.Function;

  const mockPush = jest.fn(); //.mockImplementation(console.log);
  const mockInit = jest.fn(); //.mockImplementation(console.log);
  const destination: WebDestination.Function = {
    init: mockInit,
    push: mockPush,
    config: { init: true },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.resetModules();
    w.elbLayer = [];
    w.dataLayer = [];
    w.dataLayer.push = mockPush;
  });

  test('arguments and event pushes', () => {
    elbwalker = Elbwalker({ default: true });
    elb('ingest argument', { a: 1 }, 'a', {}); // Push as arguments
    w.elbLayer.push('ingest event', { b: 2 }, 'e', []); // Push as event

    expect(mockPush).toHaveBeenCalledWith(
      expect.objectContaining({
        event: 'ingest argument',
        data: { a: 1 },
        trigger: 'a',
        nested: [],
      }),
    );
    expect(mockPush).toHaveBeenCalledWith(
      expect.objectContaining({
        event: 'ingest event',
        data: { b: 2 },
        trigger: 'e',
        nested: [],
      }),
    );
  });

  test('predefined stack without run', () => {
    elbwalker = Elbwalker();
    elb('walker destination', destination);
    elb('entity action');

    expect(mockPush).not.toHaveBeenCalled();
  });

  test('walker push pre and post go', () => {
    elb('e 1');
    elb('walker destination', destination);

    elbwalker = Elbwalker();
    elb('e 2');
    elb('walker run');
    // auto call: elb('page view');
    elb('e 4');

    expect(mockPush).toHaveBeenCalledWith(
      expect.objectContaining({
        event: 'e 1',
        count: 1,
      }),
      expect.anything(),
      undefined,
      expect.anything(),
    );

    expect(mockPush).toHaveBeenCalledWith(
      expect.objectContaining({
        event: 'e 2',
        count: 2,
      }),
      expect.anything(),
      undefined,
      expect.anything(),
    );

    expect(mockPush).toHaveBeenCalledWith(
      expect.objectContaining({
        event: 'page view',
        count: 3,
      }),
      expect.anything(),
      undefined,
      expect.anything(),
    );

    expect(mockPush).toHaveBeenCalledWith(
      expect.objectContaining({
        event: 'e 4',
        count: 4,
      }),
      expect.anything(),
      undefined,
      expect.anything(),
    );
  });

  test('predefined stack with run', () => {
    elbwalker = Elbwalker();

    elb('walker destination', destination);
    elb('ingest argument', { a: 1 }, 'a'); // Push as arguments
    w.elbLayer.push('ingest event', { b: 2 }, 'e', []); // Push as event
    elb('walker run');

    expect(mockPush).toHaveBeenCalledWith(
      expect.objectContaining({
        event: 'ingest argument',
      }),
      expect.anything(),
      undefined,
      expect.anything(),
    );
    expect(mockPush).toHaveBeenCalledWith(
      expect.objectContaining({
        event: 'ingest event',
      }),
      expect.anything(),
      undefined,
      expect.anything(),
    );
  });

  test('prioritize walker commands before run', () => {
    elbwalker = Elbwalker();

    (elb as Function)();
    elb('event postponed');
    elb('walker destination', destination);
    elb('walker user', { id: 'userid' });
    elb('walker run');
    elb('event later');

    expect(mockPush).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        event: 'event postponed',
        user: { id: 'userid' },
      }),
      expect.anything(),
      undefined,
      expect.anything(),
    );
    expect(mockPush).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        event: 'page view',
        user: { id: 'userid' },
      }),
      expect.anything(),
      undefined,
      expect.anything(),
    );
    expect(mockPush).toHaveBeenNthCalledWith(
      3,
      expect.objectContaining({
        event: 'event later',
        user: { id: 'userid' },
      }),
      expect.anything(),
      undefined,
      expect.anything(),
    );
  });

  test('elbLayer initialization', () => {
    w.elbLayer = undefined as any;

    elbwalker = Elbwalker();

    expect(w.elbLayer).toBeDefined();
  });

  test('config update', () => {
    const defaultConfig: IElbwalker.Config = {
      allowed: true,
      consent: {},
      count: expect.any(Number),
      elbLayer: w.elbLayer,
      globals: {},
      group: expect.any(String),
      pageview: true,
      prefix: 'data-elb',
      queue: expect.any(Array),
      round: expect.any(Number),
      timing: expect.any(Number),
      user: {},
      version: 0,
    };

    elbwalker = Elbwalker();
    elb('walker run');

    expect(elbwalker.config).toStrictEqual(defaultConfig);

    let update: Walker.Properties | Partial<IElbwalker.Config> = {
      prefix: 'data-custom',
    };
    let config = { ...defaultConfig, ...update };
    elb('walker config', update);
    expect(elbwalker.config).toStrictEqual(expect.objectContaining(update)); // Partial test
    expect(elbwalker.config).toStrictEqual(config); // Full test

    update = { unknown: 'random' };
    elb('walker config', update);
    expect(elbwalker.config).toStrictEqual(config);

    update = { version: 2 };
    elb('walker config', update);
    expect(elbwalker.config).toStrictEqual(expect.objectContaining(update));

    update = { pageview: false };
    elb('walker config', update);
    expect(elbwalker.config).toStrictEqual(expect.objectContaining(update));

    // Reset with w.elbLayer = [] creates another array than in defaultConfig
    w.elbLayer.length = 0;
    let globals: Walker.Properties = { static: 'value' };
    config = { ...defaultConfig, globals };
    elbwalker = Elbwalker({ globals });
    elb('walker run');
    expect(elbwalker.config).toStrictEqual(config);

    update = { foo: 'bar' };
    elb('walker config', { globals: update });
    globals = { ...globals, ...update };

    expect(elbwalker.config).toStrictEqual(
      expect.objectContaining({ globals }),
    );

    update = { another: 'value' };
    elb('walker config', { globals: update });
    globals = { ...globals, ...update };

    expect(elbwalker.config).toStrictEqual(
      expect.objectContaining({ globals }),
    );

    update = { static: 'override' };
    elb('walker config', { globals: update });
    globals = { ...globals, ...update };

    expect(elbwalker.config).toStrictEqual(
      expect.objectContaining({ globals }),
    );
  });

  test('custom elbLayer', () => {
    w.dataLayer = [];
    const customLayer1 = [] as IElbwalker.ElbLayer;
    const customLayer2 = [] as IElbwalker.ElbLayer;
    const instance1 = Elbwalker({
      elbLayer: customLayer1,
      default: true,
      pageview: false,
    });
    const instance2 = Elbwalker({
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

    customLayer1.push('e a');
    expect(mockDest1).toHaveBeenCalled();
    expect(mockDest2).not.toHaveBeenCalled();

    jest.clearAllMocks();
    customLayer2.push('e a');
    expect(mockDest1).not.toHaveBeenCalled();
    expect(mockDest2).toHaveBeenCalled();

    jest.clearAllMocks();
    instance1.push('foo bar');
    expect(mockDest1).toHaveBeenCalled();
    expect(mockDest2).not.toHaveBeenCalled();

    jest.clearAllMocks();
    instance2.push('bar foo');
    expect(mockDest1).not.toHaveBeenCalled();
    expect(mockDest2).toHaveBeenCalled();

    const length = w.dataLayer.length;
    expect(w.dataLayer[length - 1]).toEqual(
      expect.objectContaining({
        event: 'bar foo',
      }),
    );
    expect(w.dataLayer[length - 2]).toEqual(
      expect.objectContaining({
        event: 'foo bar',
      }),
    );

    jest.clearAllMocks();
    document.body.innerHTML = `<div data-elb="e" data-elbaction="load"></div>`;
    instance1.push('walker run');
    instance2.push('walker run');
    expect(mockDest1).toHaveBeenCalledWith(
      expect.objectContaining({
        event: 'e load',
      }),
      expect.anything(),
      undefined,
      expect.anything(),
    );
    expect(mockDest2).toHaveBeenCalledWith(
      expect.objectContaining({
        event: 'e load',
      }),
      expect.anything(),
      undefined,
      expect.anything(),
    );
  });

  test('elbLayer push override', () => {
    const layer: IElbwalker.ElbLayer = [];

    elbwalker = Elbwalker({ elbLayer: layer, pageview: false });
    layer.push('walker run'); // Overrites push function
    layer.push('walker destination', destination, {
      init: true,
      custom: { a: 1 },
    });
    layer.push('e a');

    expect(mockPush).toHaveBeenCalledWith(
      expect.objectContaining({
        event: 'e a',
      }),
      { init: true, custom: { a: 1 } },
      undefined,
      expect.anything(),
    );
  });

  test('command order', () => {
    elbwalker = Elbwalker();
    elb('walker run');

    // Arguments
    expect(JSON.stringify(w.elbLayer[0])).toEqual(
      JSON.stringify({ '0': { '0': 'walker run' } }),
    );

    // Parameters
    expect((w.elbLayer[1] as any)[0]).toBe('page view');
  });
});
