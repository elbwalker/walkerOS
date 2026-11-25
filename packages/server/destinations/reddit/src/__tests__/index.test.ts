import type { WalkerOS, Collector } from '@walkeros/core';
import type { Config, Destination, Env, Rules, Settings } from '../types';
import {
  clone,
  createIngest,
  getEvent,
  createMockContext,
  createMockLogger,
  StepError,
} from '@walkeros/core';
import { startFlow } from '@walkeros/collector';
import { destinationReddit } from '..';
import { examples } from '../dev';

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
      data: { message: 'Successfully processed 1 conversion events.' },
    });

    destination = jest.requireActual('../').default;

    ({ elb } = await startFlow());
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
    ).rejects.toThrow('Config settings accessToken, pixelId missing');
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
    customSendServer.mockResolvedValue({ data: {} });

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
    mockSendServer.mockRejectedValue(
      new StepError('HTTP 400', { code: 'transport', status: 400 }),
    );
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
    await elb('walker destination', {
      code: destinationWithEnv,
      config: config,
    });
    await elb(event);

    const requestBody = JSON.parse(mockSendServer.mock.calls[0][1]);
    expect(requestBody.events[0].event_type).toEqual({
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
    await elb('walker destination', {
      code: destinationWithEnv,
      config: config,
    });
    await elb(event);

    const requestBody = JSON.parse(mockSendServer.mock.calls[0][1]);
    expect(requestBody.events[0].event_type).toEqual({
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
    expect(requestBody.events[0].event_at).toBe(
      new Date(event.timestamp!).toISOString(),
    );
    expect(requestBody.events[0].event_at_ms).toBe(event.timestamp);
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
    expect(requestBody.events[0].event_metadata.conversion_id).toBe(event.id);
  });

  test('v2.0 payload structure', async () => {
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
    // v2.0 body: events at the top level, no v3 data envelope
    expect(requestBody).not.toHaveProperty('data');
    expect(Array.isArray(requestBody.events)).toBe(true);
    expect(requestBody.events).toHaveLength(1);
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
    await elb('walker destination', {
      code: destinationWithEnv,
      config: config,
    });
    await elb(event);

    const requestBody = JSON.parse(mockSendServer.mock.calls[0][1]);
    const user = requestBody.events[0].user;
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
    await elb('walker destination', {
      code: destinationWithEnv,
      config: config,
    });
    const result = await elb(event);

    expect(result.done).toBeDefined();
    expect(Object.keys(result.done!)).toHaveLength(1);
    const requestBody = JSON.parse(mockSendServer.mock.calls[0][1]);
    const capiEvent = requestBody.events[0];
    expect(capiEvent.event_type.tracking_type).toBe('Purchase');
    expect(capiEvent.event_at).toBe(new Date(event.timestamp!).toISOString());
    expect(capiEvent.event_at_ms).toBe(event.timestamp);
    expect(capiEvent.event_metadata.conversion_id).toBe(event.id);
    expect(capiEvent.event_metadata.currency).toBe('EUR');
    expect(capiEvent.event_metadata.value_decimal).toBe(462);
    expect(capiEvent.event_metadata.item_count).toBe(2);
    expect(capiEvent.event_metadata.products).toEqual([
      { id: 'ers', name: 'Everyday Ruck Snack', category: 'uncategorized' },
      { id: 'cc', name: 'Cool Cap', category: 'uncategorized' },
    ]);
  });

  describe('client IP and user agent auto-fill', () => {
    const ingest = {
      ...createIngest('test'),
      ip: '203.0.113.7',
      userAgent: 'Mozilla/5.0 test',
    };
    const sent = () => JSON.parse(mockSendServer.mock.calls[0][1]);
    // sha256('203.0.113.7'), sha256('198.51.100.2') and sha256('10.0.0.1')
    const hashedIp = {
      ingest:
        'fec52565aa0cf18f57d7cf5b3ac728503b8992d2d6f7d46da1d1201090902b02',
      event: '8c9bbd8a13b8a1f9016d2b64ef226bfdca4945918f299b5a34141013b8ae8ecc',
      mapped:
        'f5047344122f0dee9974ba6761e61c6b8649e1f3968d13a635ebbf7be53a3a0d',
    };

    test('fills client IP and user agent from ingest by default', async () => {
      await destination.push(
        getEvent(),
        createMockContext({
          config: { settings: { accessToken, pixelId } },
          env: testEnv,
          ingest,
        }),
      );
      expect(sent().events[0].user.ip_address).toBe(hashedIp.ingest);
      expect(sent().events[0].user.user_agent).toBe('Mozilla/5.0 test');
    });

    test('falls back to event.user.ip and userAgent', async () => {
      await destination.push(
        getEvent('entity action', {
          user: { id: 'us3r', ip: '198.51.100.2', userAgent: 'UA2' },
        }),
        createMockContext({
          config: { settings: { accessToken, pixelId } },
          env: testEnv,
        }),
      );
      expect(sent().events[0].user.ip_address).toBe(hashedIp.event);
      expect(sent().events[0].user.user_agent).toBe('UA2');
    });

    test('sends neither when disabled with false', async () => {
      await destination.push(
        getEvent(),
        createMockContext({
          config: {
            settings: { accessToken, pixelId, ip: false, userAgent: false },
          },
          env: testEnv,
          ingest,
        }),
      );
      expect(sent().events[0].user.ip_address).toBeUndefined();
      expect(sent().events[0].user.user_agent).toBeUndefined();
    });

    test('lets an explicitly mapped value win', async () => {
      await destination.push(
        getEvent(),
        createMockContext({
          config: { settings: { accessToken, pixelId } },
          data: { user: { ip_address: '10.0.0.1' } },
          env: testEnv,
          ingest,
        }),
      );
      expect(sent().events[0].user.ip_address).toBe(hashedIp.mapped);
    });
  });
});

describe('Reddit request and answer', () => {
  const settings: Settings = { accessToken: 's3cr3t', pixelId: 'a2_abcdef' };

  /** One page view through a real collector, with Reddit answering `answer`. */
  async function push(answer: unknown, extra: Partial<Settings> = {}) {
    const bodies: string[] = [];
    const env: Env = {
      sendServer: async (_url, body) => {
        bodies.push(String(body));
        return { data: answer };
      },
    };
    const { collector } = await startFlow({
      destinations: {
        reddit: {
          code: destinationReddit,
          config: { settings: { ...settings, ...extra } },
          env,
        },
      },
    });
    const result = await collector.push(getEvent('page view'));
    await collector.command('shutdown');
    return { result, event: JSON.parse(bodies[0]).events[0] };
  }

  const processed = { message: 'Successfully processed 1 conversion events.' };

  it('sends the action_source setting per event', async () => {
    const { event } = await push(processed, { action_source: 'OTHER' });
    expect(event.action_source).toBe('OTHER');
  });

  it.each<[string, unknown, Partial<Settings>, string | undefined]>([
    ['one processed event is delivered', processed, {}, undefined],
    [
      'one event validated in test mode is delivered',
      {
        message:
          'In test mode. 1 conversion events were validated but not processed.',
      },
      { test_mode: true },
      undefined,
    ],
    [
      'no processed event fails',
      { message: 'Successfully processed 0 conversion events.' },
      {},
      'transport',
    ],
    [
      'a message without a count fails',
      { message: 'Request received' },
      {},
      'transport',
    ],
  ])('%s', async (_, answer, extra, failed) => {
    const { result } = await push(answer, extra);
    expect(result.failed?.reddit?.reason).toEqual(
      failed
        ? expect.objectContaining({ code: failed, retryable: false })
        : undefined,
    );
  });
});
