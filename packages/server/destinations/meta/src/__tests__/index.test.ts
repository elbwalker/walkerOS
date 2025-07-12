import type { WalkerOS } from '@walkerOS/core';
import type { DestinationServer } from '@walkerOS/server-collector';
import type { Config, Destination, Settings } from '../types';
import { getEvent } from '@walkerOS/core';
import { createServerCollector } from '@walkerOS/server-collector';
import { destinationMetaExamples } from '../examples';
import { hashEvent } from '../hash';

const { events, mapping } = destinationMetaExamples;

const mockSendServer = jest.fn().mockResolvedValue({
  events_received: 1,
  messages: [],
  fbtrace_id: 'abc',
});

describe('Server Destination Meta', () => {
  jest.mock('@walkerOS/server-collector', () => ({
    ...jest.requireActual('@walkerOS/server-collector'),
    sendServer: mockSendServer,
  }));

  let destination: Destination;
  const accessToken = 's3cr3t';
  const pixelId = 'p1x3l1d';

  const mockCollector = {} as WalkerOS.Collector;
  const mockWrap = jest.fn((_name, fn) => fn);

  beforeEach(async () => {
    jest.clearAllMocks();
    jest.resetModules();

    // Reset mockSendServer to default successful response
    mockSendServer.mockResolvedValue({
      events_received: 1,
      messages: [],
      fbtrace_id: 'abc',
    });

    destination = jest.requireActual('../').default;
    destination.config = {};
  });

  afterEach(() => {});

  async function getConfig(settings: Partial<Settings> = {}) {
    return (await destination.init({
      config: { settings: settings as Settings },
      collector: mockCollector,
      wrap: mockWrap,
    })) as Config;
  }

  test('init', async () => {
    await expect(
      destination.init({
        config: {},
        collector: mockCollector,
        wrap: mockWrap,
      }),
    ).rejects.toThrow('Config settings accessToken missing');
    await expect(
      destination.init({
        config: { settings: { accessToken, pixelId: '' } },
        collector: mockCollector,
        wrap: mockWrap,
      }),
    ).rejects.toThrow('Config settings pixelId missing');

    const config = await getConfig({ accessToken, pixelId });
    expect(config).toEqual(
      expect.objectContaining({
        settings: { accessToken, pixelId },
      }),
    );
  });

  test('testCode', async () => {
    const { elb } = createServerCollector({});
    const event = getEvent();
    const config: DestinationServer.Config = {
      settings: { accessToken, pixelId, test_event_code: 'TEST' },
      mapping: mapping.config,
    };

    elb('walker destination', destination, config);
    await elb(event);
    const requestBody = JSON.parse(mockSendServer.mock.calls[0][1]);
    expect(requestBody.test_event_code).toEqual('TEST');
  });

  test('wrapper', async () => {
    const mockOnCall = jest.fn();
    const { elb } = createServerCollector({});
    const event = getEvent();
    const config: DestinationServer.Config = {
      wrapper: { onCall: mockOnCall },
      settings: { accessToken, pixelId },
    };

    elb('walker destination', destination, config);
    await elb(event);
    expect(mockOnCall).toHaveBeenCalled();
  });

  test('error', async () => {
    mockSendServer.mockResolvedValue({
      ok: false,
      data: {
        error: {
          message: 'Invalid',
          type: 'OAuthException',
          code: 190,
          fbtrace_id: 'abc',
        },
      },
      error: '400 Bad Request',
    });
    const { elb } = createServerCollector({});
    const event = getEvent();
    const config: DestinationServer.Config = {
      settings: { accessToken, pixelId, test_event_code: 'TEST' },
      mapping: mapping.config,
    };

    elb('walker destination', destination, config);
    const result = await elb(event);
    expect(result.failed.length).toEqual(1);
  });

  test('fbclid', async () => {
    const { elb } = createServerCollector({});
    const event = getEvent();
    const config: DestinationServer.Config = {
      settings: {
        accessToken,
        pixelId,
        user_data: { fbclid: { value: 'abc' } },
      },
      mapping: mapping.config,
    };

    elb('walker destination', destination, config);
    await elb(event);
    const requestBody = JSON.parse(mockSendServer.mock.calls[0][1]);
    expect(requestBody.data[0].user_data.fbc).toContain('.abc');
  });

  test('userData', async () => {
    const { elb } = createServerCollector({});
    const event = getEvent();
    const config: DestinationServer.Config = {
      settings: mapping.InitUserData,
      data: {
        map: {
          user_data: {
            map: {
              fn: { value: 'elb' },
            },
          },
        },
      },
      mapping: {
        entity: {
          action: {
            data: {
              map: {
                user_data: {
                  map: {
                    ph: { value: '123' },
                  },
                },
              },
            },
          },
        },
      },
    };

    elb('walker destination', destination, config);
    await elb(event);
    const requestBody = JSON.parse(mockSendServer.mock.calls[0][1]);
    expect(requestBody.data[0].user_data).toEqual({
      fn: expect.any(String), // from destination config data
      external_id: [
        'cc8e27118413234d4297ed00a02711365312c79325df9b5b8f4199cbd0b96e7e',
        '9176e6f336dbdb4f99b0e45cbd7e41e0e2323812b236822842a61ffbd362ac8c',
      ], // from custom user_data
      ph: expect.any(String), // from mapping
    });
  });

  test('hashing', async () => {
    expect(await hashEvent('test')).toEqual('test');
    expect(await hashEvent({ user_data: { em: 'm@i.l', foo: 'bar' } })).toEqual(
      {
        user_data: {
          em: 'd42649b85459f1140acba6d88f5325256ad2519782c520b7666c51390d9744f0',
          foo: 'bar',
        },
      },
    );
    expect(
      await hashEvent({ user_data: { em: 'm@i.l', foo: 'bar' } }, ['em']),
    ).toEqual({
      user_data: {
        em: 'm@i.l',
        foo: 'bar',
      },
    });
  });

  test('event Purchase', async () => {
    const { elb } = createServerCollector({});
    const event = getEvent('order complete');

    const config: DestinationServer.Config = {
      settings: mapping.InitUserData,
      mapping: mapping.config,
    };

    elb('walker destination', destination, config);

    await elb(event);
    const requestBody = JSON.parse(mockSendServer.mock.calls[0][1]);
    expect(requestBody).toEqual(events.Purchase());
  });
});
