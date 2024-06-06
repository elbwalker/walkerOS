import { elb, Walkerjs } from '..';
import type { WebClient, WebDestination } from '..';

describe('Destination', () => {
  let walkerjs: WebClient.Instance;

  const mockPush = jest.fn(); //.mockImplementation(console.log);
  const mockInit = jest.fn();

  let destination: WebDestination.Destination;
  let config: WebDestination.Config;

  beforeEach(() => {
    walkerjs = Walkerjs({ pageview: false, session: false });
    config = { init: false };

    destination = {
      init: mockInit,
      push: mockPush,
      config,
    };
  });

  test('basic usage', () => {
    elb('walker run');

    expect(mockInit).toHaveBeenCalledTimes(0);
    expect(mockPush).toHaveBeenCalledTimes(0);
    elb('walker destination', destination);
    elb('entity action');
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
    elb('walker run');

    // No init function
    elb('walker destination', {
      config: {},
      push: mockPush,
    });
    elb('entity action');
    expect(mockInit).toHaveBeenCalledTimes(0);
    expect(mockPush).toHaveBeenCalledTimes(1);

    // Init set to true and should not be called
    elb('walker destination', {
      init: mockInit,
      push: mockPush,
      config: { init: true },
    });
    elb('entity action');
    expect(mockInit).toHaveBeenCalledTimes(0);

    // Always trigger init since it returns false
    const mockInitFalse = jest.fn().mockImplementation(() => {
      return false;
    });
    const mockPushFalse = jest.fn();
    elb('walker destination', {
      config: {},
      init: mockInitFalse,
      push: mockPushFalse,
    });

    jest.clearAllMocks();
    elb('entity action');
    expect(mockInitFalse).toHaveBeenCalledTimes(1);
    elb('entity action');
    expect(mockInitFalse).toHaveBeenCalledTimes(2);
    expect(mockPushFalse).not.toHaveBeenCalled();
  });

  test('run call', () => {
    elb('walker run');
    elb('run one');

    elb('walker destination', {
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

    elb('walker run');
    elb('run two');

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
    elb('walker run');

    const configA = { init: false };
    const configB = { init: false };

    destination.config = configA;
    elb('walker destination', destination);
    destination.config = configB;
    elb('walker destination', destination);

    elb('entity action');
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

    elb('walker run');
    elb('walker destination', destinationUpdate);
    elb('walker destination', destination);
    elb('entity action', data);
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
    elb('walker run');

    // create invalid breaking destinations
    elb('walker destination');
    elb('walker destination', {
      config: {},
      init: () => {
        throw new Error();
      },
      push: mockPush,
    });
    elb('walker destination', destination);
    elb('entity action');

    // @TODO custom error handling
    expect(mockInit).toHaveBeenCalled(); // 2nd destination
  });

  test('mapping', () => {
    jest.clearAllMocks();
    walkerjs = Walkerjs({ elbLayer: [], pageview: false });
    elb('walker run');

    const mockPushA = jest.fn();
    const mockPushB = jest.fn();
    const mockPushC = jest.fn();

    const destinationA: WebDestination.Destination = {
      push: mockPushA,
      config: {
        mapping: {
          entity: { action: {} },
          foo: { bar: { name: 'foo bar' } },
        },
      },
    };

    const destinationB: WebDestination.Destination = {
      push: mockPushB,
      config: {
        mapping: { '*': { action: {}, '*': { ignore: true } } },
      },
    };

    const destinationC: WebDestination.Destination = {
      push: mockPushC,
      config: {
        mapping: { entity: { '*': {} }, '*': { '*': { ignore: true } } },
      },
    };

    elb('walker destination', destinationA);
    elb('walker destination', destinationB);
    elb('walker destination', destinationC);

    elb('entity action');
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
    elb('foo bar');
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
    elb('random action');
    expect(mockPushA).toHaveBeenCalledTimes(1);
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
    elb('entity random');
    expect(mockPushA).toHaveBeenCalledTimes(1);
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
    elb('absolutely unacceptable');
    expect(mockPushA).toHaveBeenCalledTimes(1);
    expect(mockPushB).toHaveBeenCalledTimes(0);
    expect(mockPushC).toHaveBeenCalledTimes(0);
  });

  test('consent', () => {
    jest.clearAllMocks();
    walkerjs = Walkerjs({
      consent: { functional: true, marketing: false },
      pageview: false,
      session: false,
    });
    elb('walker run');

    const mockPushA = jest.fn();
    const mockPushB = jest.fn();
    const mockPushC = jest.fn();

    const destinationA: WebDestination.Destination = {
      push: mockPushA,
      config: {}, // No consent settings
    };

    const destinationB: WebDestination.Destination = {
      push: mockPushB,
      config: { consent: { functional: true } },
    };

    const destinationC: WebDestination.Destination = {
      push: mockPushC,
      config: { consent: { marketing: true } },
    };

    elb('walker destination', destinationA);
    elb('walker destination', destinationB);
    elb('walker destination', destinationC);

    // Init consent state
    jest.clearAllMocks();
    elb('e a');
    expect(mockPushA).toHaveBeenCalledTimes(1);
    expect(mockPushB).toHaveBeenCalledTimes(1);
    expect(mockPushC).toHaveBeenCalledTimes(0);

    // Accepted consent
    jest.clearAllMocks();
    elb('walker consent', { marketing: true });
    expect(mockPushC).toHaveBeenCalledTimes(1); // retroactively pushed

    // Regular push to all now
    jest.clearAllMocks();
    elb('e a');
    expect(mockPushA).toHaveBeenCalledTimes(1);
    expect(mockPushB).toHaveBeenCalledTimes(1);
    expect(mockPushC).toHaveBeenCalledTimes(1);

    // Revoked consent
    jest.clearAllMocks();
    elb('walker consent', { functional: false, marketing: false });
    elb('e a');
    expect(mockPushA).toHaveBeenCalledTimes(1);
    expect(mockPushB).toHaveBeenCalledTimes(0);
    expect(mockPushC).toHaveBeenCalledTimes(0);
  });

  test('queue', () => {
    walkerjs = Walkerjs({
      consent: { functional: true },
      pageview: false,
      session: false,
    });
    elb('walker run');

    const mockPushA = jest.fn();
    const mockPushB = jest.fn();
    const mockPushC = jest.fn();

    const destinationA: WebDestination.Destination = {
      push: mockPushA,
      config: {}, // No consent settings
    };

    const destinationB: WebDestination.Destination = {
      push: mockPushB,
      config: { consent: { functional: true } },
    };

    const destinationC: WebDestination.Destination = {
      push: mockPushC,
      config: { consent: { marketing: true } },
    };

    elb('walker destination', destinationA);
    elb('walker destination', destinationB);
    elb('walker destination', destinationC);

    // Init consent state
    jest.clearAllMocks();
    elb('p v');
    expect(mockPushA).toHaveBeenCalledTimes(1);
    expect(mockPushB).toHaveBeenCalledTimes(1);
    expect(mockPushC).toHaveBeenCalledTimes(0);

    elb('e a');
    expect(mockPushC).toHaveBeenCalledTimes(0);

    // Accepted consent
    elb('walker consent', { marketing: true });

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

    elb('f b');
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
    elb('walker consent', { functional: false, marketing: false });
    elb('no pe');
    expect(mockPushA).toHaveBeenCalledTimes(1);
    expect(mockPushB).toHaveBeenCalledTimes(0);
    expect(mockPushC).toHaveBeenCalledTimes(0);

    // New run without previous events
    jest.clearAllMocks();
    elb('walker run');
    elb('walker consent', { functional: true, marketing: true });
    elb('only one');
    expect(mockPushA).toHaveBeenCalledTimes(1);
    expect(mockPushB).toHaveBeenCalledTimes(1);
    expect(mockPushC).toHaveBeenCalledTimes(1);
  });

  test('ignoring events', () => {
    elb('walker run');

    const mockPushA = jest.fn();

    const destinationIgnore: WebDestination.Destination = {
      push: mockPushA,
      config: {
        mapping: {
          foo: { bar: { ignore: false } },
        },
      },
    };
    elb('walker destination', destinationIgnore);

    elb('foo bar');
    expect(mockPushA).toHaveBeenCalledTimes(1);

    jest.clearAllMocks();

    destinationIgnore.config.mapping!.foo.bar.ignore = true;
    elb('foo bar');
    expect(mockPushA).toHaveBeenCalledTimes(0);
  });

  test('custom event name', () => {
    elb('walker run');

    const mockPushA = jest.fn();
    config = {
      mapping: {
        page: { view: { name: 'page_view' } },
      },
    };

    const destination: WebDestination.Destination = {
      push: mockPushA,
      config,
    };
    elb('walker destination', destination);

    elb('page view');
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
    walkerjs = Walkerjs({ elbLayer: [], pageview: false });
    elb('walker run');

    const mockInitA = jest.fn();
    const mockPushA = jest.fn();
    const mockInitB = jest.fn().mockImplementation(() => {
      return true;
    });
    const mockPushB = jest.fn();

    const name = 'foo';
    const config = { init: true, mapping: { p: { v: { name } } } };

    const destinationA: WebDestination.Destination = {
      init: mockInitA,
      push: mockPushA,
      config,
    };

    const destinationB: WebDestination.Destination = {
      init: mockInitB,
      push: mockPushB,
      config,
    };

    elb('walker destination', destinationA);
    elb('walker destination', destinationB, {
      init: false,
      mapping: { p: { v: { name: 'different' } } },
    });

    jest.clearAllMocks();
    elb('p v');

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
    walkerjs = Walkerjs({ elbLayer: [], pageview: false });
    elb('walker run');
    elb('walker destination', destination);

    elb('p v');
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
    const destinationLate: WebDestination.Destination = {
      push: mockPushLate,
      config,
    };
    elb('walker destination', destinationLate);
    expect(mockPushLate).toHaveBeenCalledWith(
      expect.objectContaining({
        event: 'p v',
      }),
      expect.anything(),
      undefined,
      expect.anything(),
    );

    // Expect to only process current events
    elb('walker run');
    jest.clearAllMocks();

    elb('p v2');
    expect(mockPush).toHaveBeenCalledWith(
      expect.objectContaining({
        event: 'p v2',
      }),
      expect.anything(),
      undefined,
      expect.anything(),
    );
    const mockPushLater = jest.fn();
    const destinationLater: WebDestination.Destination = {
      push: mockPushLater,
      config,
    };
    elb('walker destination', destinationLater);
    expect(mockPushLater).toHaveBeenCalledTimes(1);

    // Disable processing previous events
    const mockPushLatest = jest.fn();
    const destinationLatest: WebDestination.Destination = {
      push: mockPushLatest,
      config,
    };
    elb('walker destination', destinationLatest, {
      queue: false,
    });
    expect(mockPushLatest).toHaveBeenCalledTimes(0);
  });

  test('id namings', () => {
    elb('walker run');
    elb('walker destination', destination, { id: 'foo' });
    elb('walker destination', destination, { id: 'foo' }); // Override
    elb('walker destination', destination, { id: 'bar' });

    expect(walkerjs.destinations).toHaveProperty('foo');
    expect(Object.keys(walkerjs.destinations)).toHaveLength(2);

    elb('e a');
    expect(mockPush).toHaveBeenCalledTimes(2);
    mockPush.mockClear();
    delete walkerjs.destinations['foo']; // Delete destination
    expect(walkerjs.destinations).not.toHaveProperty('foo');
    expect(Object.keys(walkerjs.destinations)).toHaveLength(1);

    elb('e a');
    expect(mockPush).toHaveBeenCalledTimes(1);

    elb('walker destination', destination);
    expect(Object.keys(walkerjs.destinations)).toHaveLength(2);
  });

  test('minimal init type', () => {
    elb('walker destination', { push: mockPush });
    elb('walker run');
    elb('e a');

    expect(mockPush).toHaveBeenCalledTimes(1);
  });

  test('batch', () => {
    jest.useFakeTimers();
    const mockBatch = jest.fn();

    elb('walker destination', {
      push: mockPush,
      pushBatch: mockBatch,
      config: {
        mapping: {
          '*': {
            visible: { batch: 2000 },
            click: { batch: 2000 },
          },
        },
      },
    });
    elb('walker run');

    elb('foo visible');
    elb('bar visible');
    elb('foo click');
    elb('foo important');

    expect(mockPush).toHaveBeenCalledTimes(1); // Push important immediately
    expect(mockBatch).toHaveBeenCalledTimes(0);
    jest.runAllTimers();
    expect(mockBatch).toHaveBeenCalledTimes(1);
    expect(mockBatch).toHaveBeenNthCalledWith(
      1,
      [
        {
          event: expect.objectContaining({
            event: 'foo visible',
          }),
          mapping: expect.objectContaining({ batch: 2000 }),
        },
        {
          event: expect.objectContaining({
            event: 'bar visible',
          }),
          mapping: expect.objectContaining({ batch: 2000 }),
        },
        expect.objectContaining({
          event: expect.objectContaining({
            event: 'foo click',
          }),
        }),
      ],
      expect.anything(),
      expect.anything(),
    );
  });
});
