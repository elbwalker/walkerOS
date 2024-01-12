import webClient from '../';
import type { WebClient, WebDestination } from '../types';

describe('Destination', () => {
  const w = window;
  let walkerjs: WebClient.Function;

  const mockPush = jest.fn(); //.mockImplementation(console.log);
  const mockInit = jest.fn().mockImplementation(() => {
    return true;
  });

  let destination: WebDestination.Function;
  let config: WebDestination.Config;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.resetModules();

    walkerjs = webClient({ pageview: false });
    config = { init: false };

    destination = {
      init: mockInit,
      push: mockPush,
      config,
    };
  });

  test('basic usage', () => {
    walkerjs.push('walker run');

    expect(mockInit).toHaveBeenCalledTimes(0);
    expect(mockPush).toHaveBeenCalledTimes(0);
    walkerjs.push('walker destination', destination);
    walkerjs.push('entity action');
    expect(mockInit).toHaveBeenCalledTimes(1);
    expect(mockPush).toHaveBeenCalledTimes(1);
    expect(mockPush).toHaveBeenCalledWith(
      expect.objectContaining({
        event: 'entity action',
      }),
      config,
      undefined,
      expect.anything(),
    );
  });

  test('init call', () => {
    walkerjs.push('walker run');

    // No init function
    walkerjs.push('walker destination', {
      config: {},
      push: mockPush,
    });
    walkerjs.push('entity action');
    expect(mockInit).toHaveBeenCalledTimes(0);
    expect(mockPush).toHaveBeenCalledTimes(1);

    // Init set to true and should not be called
    walkerjs.push('walker destination', {
      init: mockInit,
      push: mockPush,
      config: { init: true },
    });
    walkerjs.push('entity action');
    expect(mockInit).toHaveBeenCalledTimes(0);

    // Always trigger init since it returns false
    const mockInitFalse = jest.fn().mockImplementation(() => {
      return false;
    });
    const mockPushFalse = jest.fn();
    walkerjs.push('walker destination', {
      config: {},
      init: mockInitFalse,
      push: mockPushFalse,
    });

    jest.clearAllMocks();
    walkerjs.push('entity action');
    expect(mockInitFalse).toHaveBeenCalledTimes(1);
    walkerjs.push('entity action');
    expect(mockInitFalse).toHaveBeenCalledTimes(2);
    expect(mockPushFalse).not.toHaveBeenCalled();
  });

  test('run call', () => {
    walkerjs.push('walker run');
    walkerjs.push('run one');

    walkerjs.push('walker destination', {
      config: {},
      push: mockPush,
    });

    expect(mockPush).toHaveBeenCalledWith(
      expect.objectContaining({
        event: 'run one',
      }),
      expect.anything(),
      undefined,
      expect.objectContaining({
        round: 1,
      }),
    );

    walkerjs.push('walker run');
    walkerjs.push('run two');

    expect(mockPush).toHaveBeenCalledWith(
      expect.objectContaining({
        event: 'run two',
      }),
      expect.anything(),
      undefined,
      expect.objectContaining({
        round: 2,
      }),
    );
  });

  test('multiple destinations', () => {
    walkerjs.push('walker run');

    const configA = { init: false };
    const configB = { init: false };

    destination.config = configA;
    walkerjs.push('walker destination', destination);
    destination.config = configB;
    walkerjs.push('walker destination', destination);

    walkerjs.push('entity action');
    expect(mockInit).toHaveBeenCalledTimes(2);
    expect(mockPush).toHaveBeenCalledTimes(2);
    expect(mockPush).toHaveBeenCalledWith(
      expect.objectContaining({
        event: 'entity action',
      }),
      { init: true },
      undefined,
      expect.anything(),
    );
  });

  test('preventing data manipulation', () => {
    const data = { a: 1 };
    const mockPushUpdate = jest.fn().mockImplementation((event) => {
      event.data.foo = 'bar';
    });

    const destinationUpdate = {
      init: mockInit,
      push: mockPushUpdate,
      config: {},
    };

    walkerjs.push('walker run');
    walkerjs.push('walker destination', destinationUpdate);
    walkerjs.push('walker destination', destination);
    walkerjs.push('entity action', data);
    expect(mockPushUpdate).toHaveBeenCalledTimes(1);
    expect(mockPush).toHaveBeenCalledTimes(1);
    expect(mockPush).toHaveBeenCalledWith(
      expect.objectContaining({
        event: 'entity action',
        data,
      }),
      config,
      undefined,
      expect.anything(),
    );
  });

  test('broken destination', () => {
    walkerjs.push('walker run');

    // create invalid breaking destinations
    walkerjs.push('walker destination');
    walkerjs.push('walker destination', {
      config: {},
      init: () => {
        throw new Error();
      },
      push: mockPush,
    });
    walkerjs.push('walker destination', destination);
    walkerjs.push('entity action');

    // @TODO custom error handling
    expect(mockInit).toHaveBeenCalled(); // 2nd destination
  });

  test('mapping', () => {
    jest.clearAllMocks();
    walkerjs = webClient({ elbLayer: [], pageview: false });
    walkerjs.push('walker run');

    const mockPushA = jest.fn();
    const mockPushB = jest.fn();
    const mockPushC = jest.fn();

    const destinationA: WebDestination.Function = {
      push: mockPushA,
      config: {
        mapping: {
          entity: { action: {} },
          foo: { bar: { name: 'foo bar' } },
        },
      },
    };

    const destinationB: WebDestination.Function = {
      push: mockPushB,
      config: {
        mapping: { '*': { action: {} } },
      },
    };

    const destinationC: WebDestination.Function = {
      push: mockPushC,
      config: { mapping: { entity: { '*': {} } } },
    };

    walkerjs.push('walker destination', destinationA);
    walkerjs.push('walker destination', destinationB);
    walkerjs.push('walker destination', destinationC);

    walkerjs.push('entity action');
    expect(mockPushA).toHaveBeenCalledTimes(1);
    expect(mockPushB).toHaveBeenCalledTimes(1);
    expect(mockPushC).toHaveBeenCalledTimes(1);
    expect(mockPushA).toHaveBeenCalledWith(
      expect.objectContaining({
        event: 'entity action',
      }),
      expect.anything(),
      {},
      expect.anything(),
    );
    expect(mockPushB).toHaveBeenCalledWith(
      expect.objectContaining({
        event: 'entity action',
      }),
      expect.anything(),
      {},
      expect.anything(),
    );
    expect(mockPushC).toHaveBeenCalledWith(
      expect.objectContaining({
        event: 'entity action',
      }),
      expect.anything(),
      {},
      expect.anything(),
    );

    jest.clearAllMocks();
    walkerjs.push('foo bar');
    expect(mockPushA).toHaveBeenCalledTimes(1);
    expect(mockPushB).toHaveBeenCalledTimes(0);
    expect(mockPushC).toHaveBeenCalledTimes(0);
    expect(mockPushA).toHaveBeenCalledWith(
      expect.objectContaining({
        event: 'foo bar',
      }),
      expect.anything(),
      { name: 'foo bar' },
      expect.anything(),
    );

    jest.clearAllMocks();
    walkerjs.push('random action');
    expect(mockPushA).toHaveBeenCalledTimes(0);
    expect(mockPushB).toHaveBeenCalledTimes(1);
    expect(mockPushC).toHaveBeenCalledTimes(0);
    expect(mockPushB).toHaveBeenCalledWith(
      expect.objectContaining({
        event: 'random action',
      }),
      expect.anything(),
      {},
      expect.anything(),
    );

    jest.clearAllMocks();
    walkerjs.push('entity random');
    expect(mockPushA).toHaveBeenCalledTimes(0);
    expect(mockPushB).toHaveBeenCalledTimes(0);
    expect(mockPushC).toHaveBeenCalledTimes(1);
    expect(mockPushC).toHaveBeenCalledWith(
      expect.objectContaining({
        event: 'entity random',
      }),
      expect.anything(),
      {},
      expect.anything(),
    );

    jest.clearAllMocks();
    walkerjs.push('absolutely unacceptable');
    expect(mockPushA).toHaveBeenCalledTimes(0);
    expect(mockPushB).toHaveBeenCalledTimes(0);
    expect(mockPushC).toHaveBeenCalledTimes(0);
  });

  test('consent', () => {
    jest.clearAllMocks();
    walkerjs = webClient({
      consent: { functional: true, marketing: false },
      pageview: false,
    });
    walkerjs.push('walker run');

    const mockPushA = jest.fn();
    const mockPushB = jest.fn();
    const mockPushC = jest.fn();

    const destinationA: WebDestination.Function = {
      push: mockPushA,
      config: {}, // No consent settings
    };

    const destinationB: WebDestination.Function = {
      push: mockPushB,
      config: { consent: { functional: true } },
    };

    const destinationC: WebDestination.Function = {
      push: mockPushC,
      config: { consent: { marketing: true } },
    };

    walkerjs.push('walker destination', destinationA);
    walkerjs.push('walker destination', destinationB);
    walkerjs.push('walker destination', destinationC);

    // Init consent state
    jest.clearAllMocks();
    walkerjs.push('e a');
    expect(mockPushA).toHaveBeenCalledTimes(1);
    expect(mockPushB).toHaveBeenCalledTimes(1);
    expect(mockPushC).toHaveBeenCalledTimes(0);

    // Accepted consent
    jest.clearAllMocks();
    walkerjs.push('walker consent', { marketing: true });
    expect(mockPushC).toHaveBeenCalledTimes(1); // retroactively pushed

    // Regular push to all now
    jest.clearAllMocks();
    walkerjs.push('e a');
    expect(mockPushA).toHaveBeenCalledTimes(1);
    expect(mockPushB).toHaveBeenCalledTimes(1);
    expect(mockPushC).toHaveBeenCalledTimes(1);

    // Revoked consent
    jest.clearAllMocks();
    walkerjs.push('walker consent', { functional: false, marketing: false });
    walkerjs.push('e a');
    expect(mockPushA).toHaveBeenCalledTimes(1);
    expect(mockPushB).toHaveBeenCalledTimes(0);
    expect(mockPushC).toHaveBeenCalledTimes(0);
  });

  test('queue', () => {
    walkerjs = webClient({
      consent: { functional: true },
      pageview: false,
    });
    walkerjs.push('walker run');

    const mockPushA = jest.fn();
    const mockPushB = jest.fn();
    const mockPushC = jest.fn();

    const destinationA: WebDestination.Function = {
      push: mockPushA,
      config: {}, // No consent settings
    };

    const destinationB: WebDestination.Function = {
      push: mockPushB,
      config: { consent: { functional: true } },
    };

    const destinationC: WebDestination.Function = {
      push: mockPushC,
      config: { consent: { marketing: true } },
    };

    walkerjs.push('walker destination', destinationA);
    walkerjs.push('walker destination', destinationB);
    walkerjs.push('walker destination', destinationC);

    // Init consent state
    jest.clearAllMocks();
    walkerjs.push('p v');
    expect(mockPushA).toHaveBeenCalledTimes(1);
    expect(mockPushB).toHaveBeenCalledTimes(1);
    expect(mockPushC).toHaveBeenCalledTimes(0);

    walkerjs.push('e a');
    expect(mockPushC).toHaveBeenCalledTimes(0);

    // Accepted consent
    walkerjs.push('walker consent', { marketing: true });

    expect(mockPushC).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        event: 'p v',
      }),
      expect.anything(),
      undefined,
      expect.anything(),
    );

    expect(mockPushC).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        event: 'e a',
      }),
      expect.anything(),
      undefined,
      expect.anything(),
    );

    walkerjs.push('f b');
    expect(mockPushC).toHaveBeenNthCalledWith(
      3,
      expect.objectContaining({
        event: 'f b',
      }),
      expect.anything(),
      undefined,
      expect.anything(),
    );

    // Revoked consent
    jest.clearAllMocks();
    walkerjs.push('walker consent', { functional: false, marketing: false });
    walkerjs.push('no pe');
    expect(mockPushA).toHaveBeenCalledTimes(1);
    expect(mockPushB).toHaveBeenCalledTimes(0);
    expect(mockPushC).toHaveBeenCalledTimes(0);

    // New run without previous events
    jest.clearAllMocks();
    walkerjs.push('walker run');
    walkerjs.push('walker consent', { functional: true, marketing: true });
    walkerjs.push('only one');
    expect(mockPushA).toHaveBeenCalledTimes(1);
    expect(mockPushB).toHaveBeenCalledTimes(1);
    expect(mockPushC).toHaveBeenCalledTimes(1);
  });

  test('ignoring events', () => {
    walkerjs.push('walker run');

    const mockPushA = jest.fn();

    const destinationIgnore: WebDestination.Function = {
      push: mockPushA,
      config: {
        mapping: {
          foo: { bar: { ignore: false } },
        },
      },
    };
    walkerjs.push('walker destination', destinationIgnore);

    walkerjs.push('foo bar');
    expect(mockPushA).toHaveBeenCalledTimes(1);

    jest.clearAllMocks();

    destinationIgnore.config.mapping!.foo.bar.ignore = true;
    walkerjs.push('foo bar');
    expect(mockPushA).toHaveBeenCalledTimes(0);
  });

  test('custom event name', () => {
    walkerjs.push('walker run');

    const mockPushA = jest.fn();
    config = {
      mapping: {
        page: { view: { name: 'page_view' } },
      },
    };

    const destination: WebDestination.Function = {
      push: mockPushA,
      config,
    };
    walkerjs.push('walker destination', destination);

    walkerjs.push('page view');
    expect(mockPushA).toHaveBeenCalledWith(
      expect.objectContaining({
        event: 'page_view',
      }),
      config,
      { name: 'page_view' },
      expect.anything(),
    );
  });

  test('set config on init', () => {
    walkerjs = webClient({ elbLayer: [], pageview: false });
    walkerjs.push('walker run');

    const mockInitA = jest.fn();
    const mockPushA = jest.fn();
    const mockInitB = jest.fn().mockImplementation(() => {
      return true;
    });
    const mockPushB = jest.fn();

    const name = 'foo';
    const config = { init: true, mapping: { p: { v: { name } } } };

    const destinationA: WebDestination.Function = {
      init: mockInitA,
      push: mockPushA,
      config,
    };

    const destinationB: WebDestination.Function = {
      init: mockInitB,
      push: mockPushB,
      config,
    };

    walkerjs.push('walker destination', destinationA);
    walkerjs.push('walker destination', destinationB, {
      init: false,
      mapping: { p: { v: { name: 'different' } } },
    });

    jest.clearAllMocks();
    walkerjs.push('p v');

    expect(mockInitA).not.toHaveBeenCalled();
    expect(mockPushA).toHaveBeenCalledWith(
      expect.objectContaining({ event: name }),
      expect.anything(),
      { name },
      expect.anything(),
    );
    expect(mockInitB).toHaveBeenCalled();
    expect(mockPushB).toHaveBeenCalledWith(
      expect.objectContaining({ event: 'different' }),
      expect.anything(),
      { name: 'different' },
      expect.anything(),
    );
  });

  test('temp async queue', () => {
    walkerjs = webClient({ elbLayer: [], pageview: false });
    walkerjs.push('walker run');
    walkerjs.push('walker destination', destination);

    walkerjs.push('p v');
    expect(mockPush).toHaveBeenCalledWith(
      expect.objectContaining({
        event: 'p v',
      }),
      expect.anything(),
      undefined,
      expect.anything(),
    );

    jest.clearAllMocks();

    // Expect previous events
    const mockPushLate = jest.fn();
    const destinationLate: WebDestination.Function = {
      push: mockPushLate,
      config,
    };
    walkerjs.push('walker destination', destinationLate);
    expect(mockPushLate).toHaveBeenCalledWith(
      expect.objectContaining({
        event: 'p v',
      }),
      expect.anything(),
      undefined,
      expect.anything(),
    );

    // Expect to only process current events
    walkerjs.push('walker run');
    jest.clearAllMocks();

    walkerjs.push('p v2');
    expect(mockPush).toHaveBeenCalledWith(
      expect.objectContaining({
        event: 'p v2',
      }),
      expect.anything(),
      undefined,
      expect.anything(),
    );
    const mockPushLater = jest.fn();
    const destinationLater: WebDestination.Function = {
      push: mockPushLater,
      config,
    };
    walkerjs.push('walker destination', destinationLater);
    expect(mockPushLater).toHaveBeenCalledTimes(1);

    // Disable processing previous events
    const mockPushLatest = jest.fn();
    const destinationLatest: WebDestination.Function = {
      push: mockPushLatest,
      config,
    };
    walkerjs.push('walker destination', destinationLatest, {
      queue: false,
    });
    expect(mockPushLatest).toHaveBeenCalledTimes(0);
  });

  test('id namings', () => {
    walkerjs.push('walker run');
    walkerjs.push('walker destination', destination, { id: 'foo' });
    walkerjs.push('walker destination', destination, { id: 'foo' }); // Override
    walkerjs.push('walker destination', destination, { id: 'bar' });

    expect(walkerjs.config.destinations).toHaveProperty('foo');
    expect(Object.keys(walkerjs.config.destinations)).toHaveLength(2);

    walkerjs.push('e a');
    expect(mockPush).toHaveBeenCalledTimes(2);
    mockPush.mockClear();
    delete walkerjs.config.destinations['foo']; // Delete destination
    expect(walkerjs.config.destinations).not.toHaveProperty('foo');
    expect(Object.keys(walkerjs.config.destinations)).toHaveLength(1);

    walkerjs.push('e a');
    expect(mockPush).toHaveBeenCalledTimes(1);

    walkerjs.push('walker destination', destination);
    expect(Object.keys(walkerjs.config.destinations)).toHaveLength(2);
  });

  test.skip('TODO investigate this', () => {
    walkerjs.push('walker destination', destination, { id: 'foo' });
    walkerjs.push('walker run');

    // @TODO
    // the walker destination command is not processed
    // only if walker run was called before
    expect(walkerjs.config.destinations['foo']).toBe(destination);
  });
});
