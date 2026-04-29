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

describe('Server Destination Pinterest', () => {
  let destination: Destination;
  let elb: WalkerOS.Elb;
  const accessToken = 's3cr3t';
  const adAccountId = '123456789';
  const mockSendServer = jest.fn();

  const testEnv = clone(env.push);
  testEnv.sendServer = mockSendServer;

  beforeEach(async () => {
    jest.clearAllMocks();

    mockSendServer.mockResolvedValue({
      ok: true,
      data: {
        num_events_received: 1,
        num_events_processed: 1,
        events: [{ status: 'processed' }],
      },
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
      id: 'test-pinterest',
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
        id: 'test-pinterest',
      }),
    ).rejects.toThrow('Config settings accessToken missing');
    await expect(
      destination.init({
        config: { settings: { accessToken, adAccountId: '' } },
        collector: mockCollector,
        env: testEnv,
        logger: createMockLogger(),
        id: 'test-pinterest',
      }),
    ).rejects.toThrow('Config settings adAccountId missing');

    const config = await getConfig({ accessToken, adAccountId });
    expect(config).toEqual(
      expect.objectContaining({
        settings: { accessToken, adAccountId },
      }),
    );
  });

  test('test mode', async () => {
    const event = getEvent();
    const config: Config = {
      settings: { accessToken, adAccountId, test: true },
    };

    await destination.push(
      event,
      createMockContext({
        config,
        env: testEnv,
        id: 'test-pinterest',
      }),
    );

    expect(mockSendServer).toHaveBeenCalled();
    const url = mockSendServer.mock.calls[0][0];
    expect(url).toContain('?test=true');
  });

  test('endpoint construction', async () => {
    const event = getEvent();
    const config: Config = {
      settings: { accessToken, adAccountId },
    };

    await destination.push(
      event,
      createMockContext({
        config,
        env: testEnv,
        id: 'test-pinterest',
      }),
    );

    expect(mockSendServer).toHaveBeenCalled();
    const url = mockSendServer.mock.calls[0][0];
    expect(url).toBe(
      `https://api.pinterest.com/v5/ad_accounts/${adAccountId}/events`,
    );
  });

  test('authorization header', async () => {
    const event = getEvent();
    const config: Config = {
      settings: { accessToken, adAccountId },
    };

    await destination.push(
      event,
      createMockContext({
        config,
        env: testEnv,
        id: 'test-pinterest',
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
      settings: { accessToken, adAccountId },
    };

    await destination.push(
      event,
      createMockContext({
        config,
        env: customEnv,
        id: 'test-pinterest',
      }),
    );

    expect(customSendServer).toHaveBeenCalled();
    expect(mockSendServer).not.toHaveBeenCalled();
  });

  test('error', async () => {
    mockSendServer.mockResolvedValue({
      ok: false,
      data: {
        code: 4196,
        message: 'Invalid request',
      },
      error: '400 Bad Request',
    });
    const event = getEvent();
    const config: Config = {
      settings: { accessToken, adAccountId },
    };

    await expect(
      destination.push(
        event,
        createMockContext({
          config,
          env: testEnv,
          id: 'test-pinterest',
        }),
      ),
    ).rejects.toThrow();
  });

  test('partner_name', async () => {
    const event = getEvent();
    const config: Config = {
      settings: { accessToken, adAccountId, partner_name: 'ss-walkeros' },
    };

    await destination.push(
      event,
      createMockContext({
        config,
        env: testEnv,
        id: 'test-pinterest',
      }),
    );

    const requestBody = JSON.parse(mockSendServer.mock.calls[0][1]);
    expect(requestBody.data[0].partner_name).toBe('ss-walkeros');
  });

  test('userData merge', async () => {
    const event = getEvent();
    const config: Config = {
      settings: {
        adAccountId: '123456789',
        accessToken: 's3cr3t',
        user_data: {
          external_id: { set: ['user.device', 'user.session'] },
        },
      },
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

    const { elb } = await startFlow();

    const destinationWithEnv = {
      ...destination,
      env: testEnv,
    };
    await elb('walker destination', destinationWithEnv, config);
    await elb(event);

    const requestBody = JSON.parse(mockSendServer.mock.calls[0][1]);
    expect(requestBody.data[0].user_data).toEqual({
      fn: expect.any(String), // from destination config data (hashed)
      external_id: [
        'cc8e27118413234d4297ed00a02711365312c79325df9b5b8f4199cbd0b96e7e',
        '9176e6f336dbdb4f99b0e45cbd7e41e0e2323812b236822842a61ffbd362ac8c',
      ], // from custom user_data (hashed)
      ph: expect.any(String), // from mapping (hashed)
    });
  });

  test('hashing', async () => {
    expect(await hashEvent('test')).toEqual('test');
    expect(
      await hashEvent({ user_data: { em: ['m@i.l'], foo: 'bar' } }),
    ).toEqual({
      user_data: {
        em: [
          'd42649b85459f1140acba6d88f5325256ad2519782c520b7666c51390d9744f0',
        ],
        foo: 'bar',
      },
    });
    expect(
      await hashEvent({ user_data: { em: ['m@i.l'], foo: 'bar' } }, ['em']),
    ).toEqual({
      user_data: {
        em: ['m@i.l'],
        foo: 'bar',
      },
    });
    // client_ip_address and client_user_agent should not be hashed
    expect(
      await hashEvent({
        user_data: {
          em: ['test@example.com'],
          client_ip_address: '1.2.3.4',
          client_user_agent: 'Mozilla/5.0',
        },
      }),
    ).toEqual({
      user_data: {
        em: [expect.any(String)], // hashed
        client_ip_address: '1.2.3.4', // not hashed
        client_user_agent: 'Mozilla/5.0', // not hashed
      },
    });
    // hashed_maids should be hashed (Pinterest-specific key)
    expect(
      await hashEvent({
        user_data: { hashed_maids: ['test-maid'] },
      }),
    ).toEqual({
      user_data: {
        hashed_maids: [expect.any(String)], // hashed
      },
    });
  });

  test('event checkout', async () => {
    const event = getEvent('order complete', {
      source: {
        type: 'browser',
        platform: 'web',
        url: 'https://shop.example.com/checkout',
      },
    });

    const config: Config = {
      settings: {
        adAccountId: '123456789',
        accessToken: 's3cr3t',
        user_data: {
          external_id: { set: ['user.device', 'user.session'] },
        },
      },
      mapping: {
        order: { complete: examples.step.checkout.mapping },
      } as Rules,
    };

    const { elb } = await startFlow();
    const destinationWithEnv = {
      ...destination,
      env: testEnv,
    };
    await elb('walker destination', destinationWithEnv, config);
    const result = await elb(event);

    expect(result.done).toBeDefined();
    expect(Object.keys(result.done!)).toHaveLength(1);
    const requestBody = JSON.parse(mockSendServer.mock.calls[0][1]);
    expect(requestBody.data[0].event_name).toBe('checkout');
    expect(requestBody.data[0].event_time).toBe(event.timestamp / 1000);
    expect(requestBody.data[0].event_id).toBe(event.id);
    expect(requestBody.data[0].event_source_url).toBe(event.source.url);
    expect(requestBody.data[0].action_source).toBe('web');
    expect(requestBody.data[0].custom_data).toBeDefined();
    expect(requestBody.data[0].custom_data.order_id).toBe('0rd3r1d');
    expect(requestBody.data[0].custom_data.currency).toBe('EUR');
    expect(requestBody.data[0].custom_data.value).toBe(555);
    expect(requestBody.data[0].custom_data.contents).toEqual([
      {
        id: 'ers',
        item_name: 'Everyday Ruck Snack',
        item_price: 420,
        quantity: 1,
      },
      { id: 'cc', item_name: 'Cool Cap', item_price: 42, quantity: 1 },
    ]);
    expect(requestBody.data[0].custom_data.num_items).toBe(2);
  });
});
