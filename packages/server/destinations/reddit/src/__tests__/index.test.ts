import type { WalkerOS, Collector } from '@walkeros/core';
import type { Config, Destination, Rules, Settings } from '../types';
import {
  clone,
  getEvent,
  createMockContext,
  createMockLogger,
} from '@walkeros/core';
import { startFlow } from '@walkeros/collector';
import { examples } from '../dev';
import { hashEvent } from '../hash';

const { env } = examples;

describe('Server Destination Reddit', () => {
  let destination: Destination;
  let elb: WalkerOS.Elb;
  const accessToken = 's3cr3t';
  const pixelId = 'a2_abcdef123456';
  const mockSendServer = jest.fn();

  const testEnv = clone(env.push);
  testEnv.sendServer = mockSendServer;

  beforeEach(async () => {
    jest.clearAllMocks();

    mockSendServer.mockResolvedValue({
      ok: true,
      data: { success: true },
    });

    destination = jest.requireActual('../').default;

    ({ elb } = await startFlow({
      tagging: 2,
    }));
  });

  async function getConfig(settings: Partial<Settings> = {}) {
    const mockCollector = {} as Collector.Instance;
    return (await destination.init({
      config: { settings: settings as Settings },
      collector: mockCollector,
      env: testEnv,
      logger: createMockLogger(),
      id: 'test-reddit',
    })) as Config;
  }

  test('init', async () => {
    const mockCollector = {} as Collector.Instance;
    await expect(
      destination.init({
        config: {},
        collector: mockCollector,
        env: testEnv,
        logger: createMockLogger(),
        id: 'test-reddit',
      }),
    ).rejects.toThrow('Config settings accessToken missing');
    await expect(
      destination.init({
        config: { settings: { accessToken, pixelId: '' } },
        collector: mockCollector,
        env: testEnv,
        logger: createMockLogger(),
        id: 'test-reddit',
      }),
    ).rejects.toThrow('Config settings pixelId missing');

    const config = await getConfig({ accessToken, pixelId });
    expect(config).toEqual(
      expect.objectContaining({
        settings: { accessToken, pixelId },
      }),
    );
  });

  test('test mode in body (not URL)', async () => {
    const event = getEvent();
    const config: Config = {
      settings: { accessToken, pixelId, test_mode: true },
    };

    await destination.push(
      event,
      createMockContext({
        config,
        env: testEnv,
        id: 'test-reddit',
      }),
    );

    expect(mockSendServer).toHaveBeenCalled();
    const url = mockSendServer.mock.calls[0][0];
    expect(url).not.toContain('test_mode');
    const requestBody = JSON.parse(mockSendServer.mock.calls[0][1]);
    expect(requestBody.test_mode).toBe(true);
  });

  test('endpoint construction', async () => {
    const event = getEvent();
    const config: Config = {
      settings: { accessToken, pixelId },
    };

    await destination.push(
      event,
      createMockContext({
        config,
        env: testEnv,
        id: 'test-reddit',
      }),
    );

    expect(mockSendServer).toHaveBeenCalled();
    const url = mockSendServer.mock.calls[0][0];
    expect(url).toBe(
      `https://ads-api.reddit.com/api/v2.0/conversions/events/${pixelId}`,
    );
  });

  test('authorization header', async () => {
    const event = getEvent();
    const config: Config = {
      settings: { accessToken, pixelId },
    };

    await destination.push(
      event,
      createMockContext({
        config,
        env: testEnv,
        id: 'test-reddit',
      }),
    );

    expect(mockSendServer).toHaveBeenCalled();
    const options = mockSendServer.mock.calls[0][2];
    expect(options).toEqual({
      headers: { Authorization: `Bearer ${accessToken}` },
    });
  });

  test('environment customization', async () => {
    const customSendServer = jest.fn();
    customSendServer.mockResolvedValue({ ok: true, data: {} });

    const customEnv = { sendServer: customSendServer };
    const event = getEvent();
    const config: Config = {
      settings: { accessToken, pixelId },
    };

    await destination.push(
      event,
      createMockContext({
        config,
        env: customEnv,
        id: 'test-reddit',
      }),
    );

    expect(customSendServer).toHaveBeenCalled();
    expect(mockSendServer).not.toHaveBeenCalled();
  });

  test('error', async () => {
    mockSendServer.mockResolvedValue({
      ok: false,
      data: { success: false, message: 'Invalid request' },
      error: '400 Bad Request',
    });
    const event = getEvent();
    const config: Config = {
      settings: { accessToken, pixelId },
    };

    await expect(
      destination.push(
        event,
        createMockContext({
          config,
          env: testEnv,
          id: 'test-reddit',
        }),
      ),
    ).rejects.toThrow();
  });

  test('event_type standard tracking_type', async () => {
    const event = getEvent();
    const config: Config = {
      settings: { accessToken, pixelId },
      mapping: {
        entity: { action: { name: 'Purchase' } },
      } as Rules,
    };

    const { elb } = await startFlow();
    const destinationWithEnv = { ...destination, env: testEnv };
    await elb('walker destination', destinationWithEnv, config);
    await elb(event);

    const requestBody = JSON.parse(mockSendServer.mock.calls[0][1]);
    expect(requestBody.data.events[0].event_type).toEqual({
      tracking_type: 'Purchase',
    });
  });

  test('event_type custom tracking_type', async () => {
    const event = getEvent();
    const config: Config = {
      settings: { accessToken, pixelId },
      mapping: {
        entity: { action: { name: 'my_custom_event' } },
      } as Rules,
    };

    const { elb } = await startFlow();
    const destinationWithEnv = { ...destination, env: testEnv };
    await elb('walker destination', destinationWithEnv, config);
    await elb(event);

    const requestBody = JSON.parse(mockSendServer.mock.calls[0][1]);
    expect(requestBody.data.events[0].event_type).toEqual({
      tracking_type: 'Custom',
      custom_event_name: 'my_custom_event',
    });
  });

  test('timestamp format (ISO 8601 + epoch ms)', async () => {
    const event = getEvent();
    const config: Config = {
      settings: { accessToken, pixelId },
    };

    await destination.push(
      event,
      createMockContext({
        config,
        env: testEnv,
        id: 'test-reddit',
      }),
    );

    const requestBody = JSON.parse(mockSendServer.mock.calls[0][1]);
    expect(requestBody.data.events[0].event_at).toBe(
      new Date(event.timestamp!).toISOString(),
    );
    expect(requestBody.data.events[0].event_at_ms).toBe(event.timestamp);
  });

  test('conversion_id from event.id', async () => {
    const event = getEvent();
    const config: Config = {
      settings: { accessToken, pixelId },
    };

    await destination.push(
      event,
      createMockContext({
        config,
        env: testEnv,
        id: 'test-reddit',
      }),
    );

    const requestBody = JSON.parse(mockSendServer.mock.calls[0][1]);
    expect(requestBody.data.events[0].event_metadata.conversion_id).toBe(
      event.id,
    );
  });

  test('nested payload structure', async () => {
    const event = getEvent();
    const config: Config = {
      settings: { accessToken, pixelId },
    };

    await destination.push(
      event,
      createMockContext({
        config,
        env: testEnv,
        id: 'test-reddit',
      }),
    );

    const requestBody = JSON.parse(mockSendServer.mock.calls[0][1]);
    // Nested data.events (not flat data[])
    expect(requestBody.data).toHaveProperty('events');
    expect(Array.isArray(requestBody.data.events)).toBe(true);
    expect(requestBody.data.events).toHaveLength(1);
  });

  test('hashing', async () => {
    expect(await hashEvent('test')).toEqual('test');
    // email is hashed
    expect(await hashEvent({ user: { email: 'm@i.l', uuid: '123' } })).toEqual({
      user: {
        email:
          'd42649b85459f1140acba6d88f5325256ad2519782c520b7666c51390d9744f0',
        uuid: '123',
      },
    });
    // doNotHash skips hashing
    expect(
      await hashEvent({ user: { email: 'm@i.l', uuid: '123' } }, ['email']),
    ).toEqual({
      user: {
        email: 'm@i.l',
        uuid: '123',
      },
    });
    // ip_address and user_agent ARE hashed (unlike Meta/Pinterest)
    expect(
      await hashEvent({
        user: {
          ip_address: '1.2.3.4',
          user_agent: 'Mozilla/5.0',
        },
      }),
    ).toEqual({
      user: {
        ip_address: expect.any(String),
        user_agent: expect.any(String),
      },
    });
    // opt_out pass-through
    expect(
      await hashEvent({
        user: { email: 'test@example.com', opt_out: false },
      }),
    ).toEqual({
      user: {
        email: expect.any(String),
        opt_out: false,
      },
    });
    // idfa and aaid are hashed
    expect(
      await hashEvent({
        user: { idfa: 'idfa-value', aaid: 'aaid-value' },
      }),
    ).toEqual({
      user: {
        idfa: expect.any(String),
        aaid: expect.any(String),
      },
    });
  });

  test('userData merge', async () => {
    const event = getEvent();
    const config: Config = {
      settings: {
        accessToken,
        pixelId,
        user_data: {
          external_id: 'user.device',
        },
      },
      data: {
        map: {
          user: {
            map: {
              email: { value: 'config@example.com' },
            },
          },
        },
      },
      mapping: {
        entity: {
          action: {
            data: {
              map: {
                user: {
                  map: {
                    aaid: { value: 'mapping-aaid' },
                  },
                },
              },
            },
          },
        },
      },
    };

    const { elb } = await startFlow();
    const destinationWithEnv = { ...destination, env: testEnv };
    await elb('walker destination', destinationWithEnv, config);
    await elb(event);

    const requestBody = JSON.parse(mockSendServer.mock.calls[0][1]);
    const user = requestBody.data.events[0].user;
    // All three sources of user data are merged (email, external_id, aaid are hashed)
    expect(user.email).toEqual(expect.any(String));
    expect(user.external_id).toEqual(expect.any(String));
    expect(user.aaid).toEqual(expect.any(String));
  });

  test('event purchase', async () => {
    const event = getEvent('order complete');

    const config: Config = {
      settings: { accessToken, pixelId },
      mapping: {
        order: { complete: examples.step.purchase.mapping },
      } as Rules,
    };

    const { elb } = await startFlow();
    const destinationWithEnv = { ...destination, env: testEnv };
    await elb('walker destination', destinationWithEnv, config);
    const result = await elb(event);

    expect(result.done).toBeDefined();
    expect(Object.keys(result.done!)).toHaveLength(1);
    const requestBody = JSON.parse(mockSendServer.mock.calls[0][1]);
    const capiEvent = requestBody.data.events[0];
    expect(capiEvent.event_type.tracking_type).toBe('Purchase');
    expect(capiEvent.event_at).toBe(new Date(event.timestamp!).toISOString());
    expect(capiEvent.event_at_ms).toBe(event.timestamp);
    expect(capiEvent.event_metadata.conversion_id).toBe(event.id);
    expect(capiEvent.event_metadata.currency).toBe('EUR');
    expect(capiEvent.event_metadata.value_decimal).toBe(555);
    expect(capiEvent.event_metadata.item_count).toBe(2);
    expect(capiEvent.event_metadata.products).toEqual([
      { id: 'ers', name: 'Everyday Ruck Snack', category: 'uncategorized' },
      { id: 'cc', name: 'Cool Cap', category: 'uncategorized' },
    ]);
  });
});
