import type { WalkerOS, Collector } from '@walkeros/core';
import type { Config, Destination, Settings } from '../types';
import { getEvent } from '@walkeros/core';
import { createCollector } from '@walkeros/collector';
import { examples } from '../';
import { hashEvent } from '../hash';

const { events, mapping } = examples;

describe('Server Destination Meta', () => {
  let destination: Destination;
  let elb: WalkerOS.Elb;
  const accessToken = 's3cr3t';
  const pixelId = 'p1x3l1d';
  const mockSendServer = jest.fn();

  const testEnv = {
    sendServer: mockSendServer,
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    // Reset mockSendServer to default successful response
    mockSendServer.mockResolvedValue({
      ok: true,
      data: {
        events_received: 1,
        messages: [],
        fbtrace_id: 'abc',
      },
    });

    destination = jest.requireActual('../').default;

    ({ elb } = await createCollector({
      tagging: 2,
    }));
  });

  afterEach(() => {});

  async function getConfig(settings: Partial<Settings> = {}) {
    const mockCollector = {} as Collector.Instance;
    return (await destination.init({
      config: { settings: settings as Settings },
      collector: mockCollector,
      env: testEnv,
    })) as Config;
  }

  test('init', async () => {
    const mockCollector = {} as Collector.Instance;
    await expect(
      destination.init({
        config: {},
        collector: mockCollector,
        env: testEnv,
      }),
    ).rejects.toThrow('Config settings accessToken missing');
    await expect(
      destination.init({
        config: { settings: { accessToken, pixelId: '' } },
        collector: mockCollector,
        env: testEnv,
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
    const mockCollector = {} as Collector.Instance;
    const event = getEvent();
    const config: Config = {
      settings: { accessToken, pixelId, test_event_code: 'TEST' },
      mapping: mapping.config,
    };

    await destination.push(event, {
      config,
      collector: mockCollector,
      env: testEnv,
    });

    expect(mockSendServer).toHaveBeenCalled();
    const requestBody = JSON.parse(mockSendServer.mock.calls[0][1]);
    expect(requestBody.test_event_code).toEqual('TEST');
  });

  test('environment customization', async () => {
    const customSendServer = jest.fn();
    customSendServer.mockResolvedValue({ ok: true, data: {} });

    const customEnv = { sendServer: customSendServer };
    const event = getEvent();
    const config: Config = {
      settings: { accessToken, pixelId },
    };

    await destination.push(event, {
      config,
      collector: {} as Collector.Instance,
      env: customEnv,
    });

    expect(customSendServer).toHaveBeenCalled();
    expect(mockSendServer).not.toHaveBeenCalled();
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
    const mockCollector = {} as Collector.Instance;
    const event = getEvent();
    const config: Config = {
      settings: { accessToken, pixelId, test_event_code: 'TEST' },
      mapping: mapping.config,
    };

    await expect(
      destination.push(event, {
        config,
        collector: mockCollector,
        env: testEnv,
      }),
    ).rejects.toThrow();
  });

  test('fbclid', async () => {
    const mockCollector = {} as Collector.Instance;
    const event = getEvent();
    const config: Config = {
      settings: {
        accessToken,
        pixelId,
        user_data: { fbclid: { value: 'abc' } },
      },
      mapping: mapping.config,
    };

    await destination.push(event, {
      config,
      collector: mockCollector,
      env: testEnv,
    });
    const requestBody = JSON.parse(mockSendServer.mock.calls[0][1]);
    expect(requestBody.data[0].user_data.fbc).toContain('.abc');
  });

  test('userData', async () => {
    const event = getEvent();
    const config: Config = {
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

    const { elb } = await createCollector();

    const destinationWithEnv = {
      ...destination,
      env: testEnv,
    };
    await elb('walker destination', destinationWithEnv, config);
    const result = await elb(event);

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
    const event = getEvent('order complete');

    const config: Config = {
      settings: mapping.InitUserData,
      mapping: mapping.config,
    };

    const { elb } = await createCollector();
    const destinationWithEnv = {
      ...destination,
      env: testEnv,
    };
    await elb('walker destination', destinationWithEnv, config);
    const result = await elb(event);

    expect(result.successful).toHaveLength(1);
    const requestBody = JSON.parse(mockSendServer.mock.calls[0][1]);
    expect(requestBody).toEqual(events.Purchase());
  });
});
