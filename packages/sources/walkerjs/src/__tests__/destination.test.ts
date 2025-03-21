import type { SourceWalkerjs, DestinationWeb } from '..';
import { mockDataLayer } from '@elbwalker/jest/web.setup';
import { getEvent } from '@elbwalker/utils';
import { createSourceWalkerjs, elb as elbOrg } from '..';

describe('Destination', () => {
  let instance: SourceWalkerjs.Instance;
  let elb = elbOrg;

  const mockPush = jest.fn(); //.mockImplementation(console.log);
  const mockInit = jest.fn();

  const event = getEvent();
  let destination: DestinationWeb.Destination;
  let config: DestinationWeb.Config;

  beforeEach(() => {
    ({ elb, instance } = createSourceWalkerjs({
      pageview: false,
      session: false,
    }));

    config = { init: false };

    destination = {
      init: mockInit,
      push: mockPush,
      config,
    };
  });

  test('basic usage', async () => {
    elb('walker run');

    expect(mockInit).toHaveBeenCalledTimes(0);
    expect(mockPush).toHaveBeenCalledTimes(0);
    elb('walker destination', destination);
    await elb(event);

    expect(mockInit).toHaveBeenCalledTimes(1);
    expect(mockPush).toHaveBeenCalledTimes(1);
    expect(mockPush).toHaveBeenCalledWith(
      expect.objectContaining({
        event: event.event,
      }),
      config,
      undefined,
      expect.anything(),
    );
  });

  test('init call', async () => {
    elb('walker run');

    // No init function
    elb('walker destination', {
      config: {},
      push: mockPush,
    });
    await elb(event);

    expect(mockInit).toHaveBeenCalledTimes(0);
    expect(mockPush).toHaveBeenCalledTimes(1);

    // Init set to true and should not be called
    elb('walker destination', {
      init: mockInit,
      push: mockPush,
      config: { init: true },
    });

    await elb(event);
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

    await elb(event);
    expect(mockInitFalse).toHaveBeenCalledTimes(1);

    await elb(event);
    expect(mockInitFalse).toHaveBeenCalledTimes(2);
    expect(mockPushFalse).not.toHaveBeenCalled();
  });

  test('run call', async () => {
    elb('walker run');
    elb('run one');

    await elb('walker destination', {
      config: {},
      push: mockPush,
    });

    expect(mockPush).toHaveBeenCalledWith(
      expect.objectContaining({
        event: 'run one',
      }),
      expect.anything(),
      undefined,
      { instance },
    );

    elb('walker run');
    await elb('run two');

    expect(mockPush).toHaveBeenCalledWith(
      expect.objectContaining({
        event: 'run two',
      }),
      expect.anything(),
      undefined,
      { instance },
    );
  });

  test('multiple destinations', async () => {
    elb('walker run');

    const configA = { init: false };
    const configB = { init: false };

    destination.config = configA;
    elb('walker destination', destination);
    destination.config = configB;
    elb('walker destination', destination);

    await elb(event);
    expect(mockInit).toHaveBeenCalledTimes(2);
    expect(mockPush).toHaveBeenCalledTimes(2);
    expect(mockPush).toHaveBeenCalledWith(
      expect.objectContaining({
        event: event.event,
      }),
      { init: true },
      undefined,
      expect.anything(),
    );
  });

  test('preventing data manipulation', async () => {
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
    await elb('entity action', data);
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

  test('broken destination', async () => {
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
    await elb(event);

    // @TODO custom error handling
    expect(mockInit).toHaveBeenCalled(); // 2nd destination
  });

  test('mapping', async () => {
    elb('walker run');

    const mockPushA = jest.fn();
    const mockPushB = jest.fn();
    const mockPushC = jest.fn();

    const destinationA: DestinationWeb.Destination = {
      push: mockPushA,
      config: {
        mapping: {
          entity: { action: {} },
          foo: { bar: { name: 'foo bar' } },
        },
      },
    };

    const destinationB: DestinationWeb.Destination = {
      push: mockPushB,
      config: {
        mapping: { '*': { action: {}, '*': { ignore: true } } },
      },
    };

    const destinationC: DestinationWeb.Destination = {
      push: mockPushC,
      config: {
        mapping: { entity: { '*': {} }, '*': { '*': { ignore: true } } },
      },
    };

    elb('walker destination', destinationA);
    elb('walker destination', destinationB);
    elb('walker destination', destinationC);

    await elb(event);
    expect(mockPushA).toHaveBeenCalledTimes(1);
    expect(mockPushB).toHaveBeenCalledTimes(1);
    expect(mockPushC).toHaveBeenCalledTimes(1);
    expect(mockPushA).toHaveBeenCalledWith(
      expect.objectContaining({
        event: event.event,
      }),
      expect.anything(),
      {},
      expect.anything(),
    );
    expect(mockPushB).toHaveBeenCalledWith(
      expect.objectContaining({
        event: event.event,
      }),
      expect.anything(),
      {},
      expect.anything(),
    );
    expect(mockPushC).toHaveBeenCalledWith(
      expect.objectContaining({
        event: event.event,
      }),
      expect.anything(),
      {},
      expect.anything(),
    );

    jest.clearAllMocks();
    await elb('foo bar');
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
    await elb('random action');
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
    await elb('entity random');
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
    await elb('absolutely unacceptable');
    expect(mockPushA).toHaveBeenCalledTimes(1);
    expect(mockPushB).toHaveBeenCalledTimes(0);
    expect(mockPushC).toHaveBeenCalledTimes(0);
  });

  test('mapping data', async () => {
    elb('walker run');
    elb('foo bar');

    const eventMapping = { data: { value: 'bar' } };
    await elb(
      'walker destination',
      { push: mockPush },
      {
        data: { value: 'foo' },
        mapping: { foo: { bar: eventMapping } },
      },
    );

    // Event data
    expect(mockPush).toHaveBeenCalledWith(
      expect.objectContaining({ event: 'foo bar' }),
      expect.anything(),
      eventMapping,
      { data: 'bar', instance: expect.anything() },
    );

    // Destination data
    jest.clearAllMocks();
    await elb(event);
    expect(mockPush).toHaveBeenCalledWith(
      expect.objectContaining({ event: event.event }),
      expect.anything(),
      undefined,
      { data: 'foo', instance: expect.anything() },
    );
  });

  test('mapping data merge', async () => {
    elb('walker run');
    elb('foo bar');

    const eventMapping = { data: { map: { foo: { value: 'bar' } } } };
    await elb(
      'walker destination',
      { push: mockPush },
      {
        data: { map: { foo: { value: 'unknown' }, bar: { value: 'baz' } } },
        mapping: { foo: { bar: eventMapping } },
      },
    );

    expect(mockPush).toHaveBeenCalledWith(
      expect.any(Object),
      expect.any(Object),
      eventMapping,
      {
        data: {
          foo: 'bar',
          bar: 'baz',
        },
        instance: expect.anything(),
      },
    );
  });

  test('consent', async () => {
    jest.clearAllMocks();
    const { elb } = createSourceWalkerjs({
      consent: { functional: true, marketing: false },
      pageview: false,
      session: false,
      run: true,
    });

    const mockPushA = jest.fn();
    const mockPushB = jest.fn();
    const mockPushC = jest.fn();
    const mockPushD = jest.fn();

    const destinationA: DestinationWeb.Destination = {
      push: mockPushA,
      config: {}, // No consent settings
    };

    const destinationB: DestinationWeb.Destination = {
      push: mockPushB,
      config: { consent: { functional: true } },
    };

    const destinationC: DestinationWeb.Destination = {
      push: mockPushC,
      config: { consent: { marketing: true } },
    };

    const destinationD: DestinationWeb.Destination = {
      push: mockPushD,
      config: { consent: { via_event: true } },
    };

    elb('walker destination', destinationA);
    elb('walker destination', destinationB);
    elb('walker destination', destinationC);
    elb('walker destination', destinationD);

    // Init consent state
    jest.clearAllMocks();
    await elb('e a');
    expect(mockPushA).toHaveBeenCalledTimes(1);
    expect(mockPushB).toHaveBeenCalledTimes(1);
    expect(mockPushC).toHaveBeenCalledTimes(0);

    // Accepted consent
    jest.clearAllMocks();
    await elb('walker consent', { marketing: true });
    expect(mockPushC).toHaveBeenCalledTimes(1); // retroactively pushed

    // Regular push to all now
    jest.clearAllMocks();
    await elb('e a');
    expect(mockPushA).toHaveBeenCalledTimes(1);
    expect(mockPushB).toHaveBeenCalledTimes(1);
    expect(mockPushC).toHaveBeenCalledTimes(1);

    // Revoked consent
    jest.clearAllMocks();
    elb('walker consent', { functional: false, marketing: false });
    await elb('e a');
    expect(mockPushA).toHaveBeenCalledTimes(1);
    expect(mockPushB).toHaveBeenCalledTimes(0);
    expect(mockPushC).toHaveBeenCalledTimes(0);

    // Consent in event
    expect(mockPushD).toHaveBeenCalledTimes(0);
    expect(instance.consent.via_event).not.toBeTruthy();

    jest.clearAllMocks();
    await elb({ event: 'via event', consent: { via_event: true } });
    expect(mockPushB).toHaveBeenCalledTimes(0); // requires functional consent only
    expect(mockPushD).toHaveBeenCalledTimes(1);
  });

  test('queue', async () => {
    const { elb } = createSourceWalkerjs({
      consent: { functional: true },
      pageview: false,
      session: false,
      run: true,
    });

    const mockPushA = jest.fn();
    const mockPushB = jest.fn();
    const mockPushC = jest.fn();

    const destinationA: DestinationWeb.Destination = {
      push: mockPushA,
      config: {}, // No consent settings
    };

    const destinationB: DestinationWeb.Destination = {
      push: mockPushB,
      config: { consent: { functional: true } },
    };

    const destinationC: DestinationWeb.Destination = {
      push: mockPushC,
      config: { consent: { marketing: true } },
    };

    elb('walker destination', destinationA);
    elb('walker destination', destinationB);
    elb('walker destination', destinationC);

    // Init consent state
    jest.clearAllMocks();
    await elb('p v');
    expect(mockPushA).toHaveBeenCalledTimes(1);
    expect(mockPushB).toHaveBeenCalledTimes(1);
    expect(mockPushC).toHaveBeenCalledTimes(0);

    await elb('e a');
    expect(mockPushC).toHaveBeenCalledTimes(0);

    // Accepted consent
    await elb('walker consent', { marketing: true });

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

    await elb('f b');
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
    await elb('no pe');
    expect(mockPushA).toHaveBeenCalledTimes(1);
    expect(mockPushB).toHaveBeenCalledTimes(0);
    expect(mockPushC).toHaveBeenCalledTimes(0);

    // New run without previous events
    jest.clearAllMocks();
    elb('walker run');
    elb('walker consent', { functional: true, marketing: true });
    await elb('only one');
    expect(mockPushA).toHaveBeenCalledTimes(1);
    expect(mockPushB).toHaveBeenCalledTimes(1);
    expect(mockPushC).toHaveBeenCalledTimes(1);
  });

  test('ignoring events', async () => {
    elb('walker run');

    const mockPushA = jest.fn();

    const destinationIgnore: DestinationWeb.Destination = {
      push: mockPushA,
      config: {
        mapping: {
          foo: { bar: { ignore: false } },
        },
      },
    };
    elb('walker destination', destinationIgnore);

    await elb('foo bar');
    expect(mockPushA).toHaveBeenCalledTimes(1);

    jest.clearAllMocks();

    destinationIgnore.config.mapping!.foo!.bar = { ignore: true };
    await elb('foo bar');
    expect(mockPushA).toHaveBeenCalledTimes(0);
  });

  test('custom event name', async () => {
    elb('walker run');

    const mockPushA = jest.fn();
    config = {
      mapping: {
        page: { view: { name: 'page_view' } },
      },
    };

    const destination: DestinationWeb.Destination = {
      push: mockPushA,
      config,
    };
    elb('walker destination', destination);

    await elb('page view');
    expect(mockPushA).toHaveBeenCalledWith(
      expect.objectContaining({
        event: 'page_view',
      }),
      config,
      { name: 'page_view' },
      expect.anything(),
    );
  });

  test('set config on init', async () => {
    elb('walker run');

    const mockInitA = jest.fn();
    const mockPushA = jest.fn();
    const mockInitB = jest.fn();
    const mockPushB = jest.fn();

    const name = 'foo';
    const config = { init: true, mapping: { p: { v: { name } } } };

    const destinationA: DestinationWeb.Destination = {
      init: mockInitA,
      push: mockPushA,
      config,
    };

    const destinationB: DestinationWeb.Destination = {
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
    await elb('p v');

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

    // Save config automatically
    await elb('walker destination', {
      type: 'save',
      config: {},
      init: jest.fn().mockImplementation(() => {
        return { foo: 'bar' };
      }),
      push: mockPush,
    });
    const destinationSave = Object.values(instance.destinations).filter(
      (item) => item.type === 'save',
    )[0];
    expect(destinationSave.config).toEqual({ foo: 'bar', init: true });
  });

  test('temp async queue', async () => {
    const { elb } = createSourceWalkerjs({ elbLayer: [], pageview: false });
    elb('walker run');
    elb('walker destination', destination);

    await elb('p v');
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
    const destinationLate: DestinationWeb.Destination = {
      push: mockPushLate,
      config,
    };
    await elb('walker destination', destinationLate);
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

    await elb('p v2');
    expect(mockPush).toHaveBeenCalledWith(
      expect.objectContaining({
        event: 'p v2',
      }),
      expect.anything(),
      undefined,
      expect.anything(),
    );
    const mockPushLater = jest.fn();
    const destinationLater: DestinationWeb.Destination = {
      push: mockPushLater,
      config,
    };
    await elb('walker destination', destinationLater);
    expect(mockPushLater).toHaveBeenCalledTimes(1);

    // Disable processing previous events
    const mockPushLatest = jest.fn();
    const destinationLatest: DestinationWeb.Destination = {
      push: mockPushLatest,
      config,
    };
    await elb('walker destination', destinationLatest, {
      queue: false,
    });
    expect(mockPushLatest).toHaveBeenCalledTimes(0);
  });

  test('id namings', async () => {
    elb('walker run');
    elb('walker destination', destination, { id: 'foo' });
    elb('walker destination', destination, { id: 'foo' }); // Override
    elb('walker destination', destination, { id: 'bar' });

    expect(instance.destinations).toHaveProperty('foo');
    expect(Object.keys(instance.destinations)).toHaveLength(2);

    await elb('e a');
    expect(mockPush).toHaveBeenCalledTimes(2);
    mockPush.mockClear();
    delete instance.destinations['foo']; // Delete destination
    expect(instance.destinations).not.toHaveProperty('foo');
    expect(Object.keys(instance.destinations)).toHaveLength(1);

    await elb('e a');
    expect(mockPush).toHaveBeenCalledTimes(1);

    elb('walker destination', destination);
    expect(Object.keys(instance.destinations)).toHaveLength(2);
  });

  test('minimal init type', async () => {
    elb('walker destination', { push: mockPush });
    elb('walker run');
    await elb('e a');

    expect(mockPush).toHaveBeenCalledTimes(1);
  });

  test('batch', async () => {
    const mockBatch = jest.fn();

    elb('walker run');
    elb('walker destination', {
      push: mockPush,
      pushBatch: mockBatch,
      config: {
        mapping: {
          product: {
            click: { batch: 50 },
            visible: { batch: 2000 },
          },
          promotion: {
            click: { batch: 50 },
            visible: { batch: 2000 },
          },
          '*': {
            click: { batch: 50 },
            visible: { batch: 2000 },
          },
        },
      },
    });

    await elb('product visible', { id: 1 });
    await elb('product visible', { id: 2 });
    await elb('promotion visible', { id: 3 });
    await elb('rage click', { id: 4 });
    await elb('rage click', { id: 5 });
    await elb('rage click', { id: 6 });
    await elb('product important', { id: 7 });

    // Push important immediately
    expect(mockPush).toHaveBeenCalledTimes(1);
    expect(mockBatch).toHaveBeenCalledTimes(0);

    // Rage clicks
    jest.advanceTimersByTime(50);
    expect(mockBatch).toHaveBeenCalledTimes(1);

    jest.clearAllMocks();
    jest.advanceTimersByTime(2000);

    expect(mockBatch).toHaveBeenCalledTimes(2);
    // product visible
    expect(mockBatch).toHaveBeenNthCalledWith(
      1,
      {
        key: 'product visible',
        events: expect.any(Array),
        data: [],
      },
      expect.anything(),
      expect.anything(),
    );

    // promotion visible
    expect(mockBatch).toHaveBeenNthCalledWith(
      2,
      {
        key: 'promotion visible',
        events: expect.any(Array),
        data: [],
      },
      expect.anything(),
      expect.anything(),
    );
  });

  test('dataLayer config', async () => {
    const { elb } = createSourceWalkerjs({
      default: true,
      pageview: false,
      session: false,
      dataLayerConfig: {
        consent: { functional: true },
        mapping: {
          entity: { action: { data: { value: 'foo' } } },
          '*': {
            visible: { batch: 2000, data: { value: 'bar' } },
          },
        },
      },
    });

    await elb('entity action');
    expect(mockDataLayer).toHaveBeenCalledTimes(0);
    await elb('walker consent', { functional: true });
    expect(mockDataLayer).toHaveBeenCalledTimes(1);

    await elb('product visible');
    await elb('product visible');

    jest.clearAllMocks();
    expect(mockDataLayer).toHaveBeenCalledTimes(0);

    jest.runAllTimers();
    expect(mockDataLayer).toHaveBeenCalledTimes(1);
    expect(mockDataLayer).toHaveBeenCalledWith({
      event: 'batch',
      batched_event: '* visible',
      events: ['bar', 'bar'],
    });

    jest.clearAllMocks();
    await elb(event);
    expect(mockDataLayer).toHaveBeenCalledWith('foo');
  });

  test('immutable events', async () => {
    let changedByFirst = false;
    const first = jest.fn();
    const fistDestination: DestinationWeb.Destination = {
      config: {
        mapping: {
          // Destination will change event
          entity: { action: { name: 'new name' } },
        },
      },
      push: (event) => {
        // Destination will change event
        event.custom = { foo: 'bar' };
        changedByFirst = true;

        first({ ...event });
      },
    };
    const second = jest.fn();
    const secondDestination: DestinationWeb.Destination = {
      config: {},
      push: (event) => {
        // Make sure the first destination was called before
        if (!changedByFirst) throw Error('wrong execution order');

        second(event);
      },
    };

    const { elb } = createSourceWalkerjs({
      run: true,
      pageview: false,
      session: false,
      destinations: { fistDestination, secondDestination },
    });

    const mockEvent = { event: 'entity action' };

    await elb(mockEvent);

    expect(first).toHaveBeenCalledTimes(1);
    expect(second).toHaveBeenCalledTimes(1);
    expect(first).toHaveBeenCalledWith(
      expect.objectContaining({
        event: 'new name',
        custom: { foo: 'bar' },
      }),
    );
    expect(second).toHaveBeenCalledWith(
      expect.objectContaining({
        event: 'entity action',
        custom: {},
      }),
    );
  });

  test('policy', async () => {
    const policy = {
      event: {
        value: 'new name',
      },
      'data.string': { value: 'bar' },
      'nested.0.type': { value: 'kid' },
      'data.number': {
        consent: { marketing: true },
      },
      'data.new': { value: 'value' },
      // timing: { value: 'now' }, // @TODO shouldn't be possible
    };

    const destination: DestinationWeb.Destination = {
      config: { policy },
      push: (e) => {
        mockPush(e);
      },
    };

    const { elb } = createSourceWalkerjs({
      run: true,
      pageview: false,
      session: false,
      destinations: { destination },
    });

    await elb(event);

    expect(mockPush).toHaveBeenCalledWith({
      ...event,
      event: 'new name',
      data: expect.objectContaining({
        string: 'bar',
        number: undefined, // Redacted due to missing consent
        new: 'value',
      }),
      nested: [expect.objectContaining({ type: 'kid' })],
      // timing: 0, // @TODO should be set to default type
    });
  });
});
