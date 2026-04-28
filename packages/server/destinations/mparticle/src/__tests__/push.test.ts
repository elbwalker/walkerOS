import type { Collector, WalkerOS } from '@walkeros/core';
import {
  clone,
  createMockContext,
  createMockLogger,
  getEvent,
} from '@walkeros/core';
import { startFlow } from '@walkeros/collector';
import { examples } from '../dev';
import type { Config, Destination, Rules } from '../types';

const { env } = examples;

describe('push', () => {
  let destination: Destination;
  const apiKey = 'key';
  const apiSecret = 'secret';
  const mockSendServer = jest.fn();
  let testEnv: typeof env.push;

  beforeEach(() => {
    jest.clearAllMocks();
    mockSendServer.mockResolvedValue({ ok: true, data: {} });
    testEnv = clone(env.push);
    testEnv.sendServer = mockSendServer;
    destination = jest.requireActual('../').default;
  });

  async function pushWith(
    event: WalkerOS.Event,
    config: Config,
    customEnv: typeof env.push = testEnv,
  ): Promise<void> {
    await destination.push(
      event,
      createMockContext({
        config,
        env: customEnv,
        id: 'test-mparticle',
      }),
    );
  }

  async function pushViaFlow(
    event: WalkerOS.Event,
    config: Config,
  ): Promise<void> {
    const { elb } = await startFlow();
    await elb('walker destination', { ...destination, env: testEnv }, config);
    await elb(event);
  }

  test('posts to default us1 endpoint with Basic auth and JSON content type', async () => {
    const event = getEvent('product view', {
      timestamp: 1700000100000,
      user: { id: 'u1' },
    });
    const config: Config = {
      settings: {
        apiKey,
        apiSecret,
        pod: 'us1',
        environment: 'production',
        userIdentities: { customer_id: 'user.id' },
      },
    };

    await pushWith(event, config);

    expect(mockSendServer).toHaveBeenCalledTimes(1);
    const [url, body, options] = mockSendServer.mock.calls[0];
    expect(url).toBe('https://s2s.mparticle.com/v2/events');
    const parsed = JSON.parse(body as string);
    expect(parsed.events[0].event_type).toBe('custom_event');
    expect(parsed.events[0].data.custom_event_type).toBe('other');
    expect(parsed.user_identities).toEqual({ customer_id: 'u1' });
    expect(parsed.environment).toBe('production');
    expect(options.headers.Authorization).toBe(
      `Basic ${Buffer.from(`${apiKey}:${apiSecret}`).toString('base64')}`,
    );
    expect(options.headers['Content-Type']).toBe('application/json');
  });

  test('uses screen_view when mapping.eventType is screen_view', async () => {
    const event = getEvent('page view', {
      timestamp: 1700000200000,
      user: { id: 'u1' },
    });
    const config: Config = {
      settings: {
        apiKey,
        apiSecret,
        userIdentities: { customer_id: 'user.id' },
      },
      mapping: {
        page: { view: { settings: { eventType: 'screen_view' } } },
      } as Rules,
    };
    await pushViaFlow(event, config);

    const parsed = JSON.parse(mockSendServer.mock.calls[0][1] as string);
    expect(parsed.events[0].event_type).toBe('screen_view');
    expect(parsed.events[0].data.screen_name).toBe('page view');
  });

  test('uses commerce_event when mapping.eventType is commerce_event', async () => {
    const event = getEvent('order complete', {
      timestamp: 1700000300000,
      data: { id: 'ORD-1', total: 99.99, currency: 'USD' },
      user: { id: 'u1' },
    });
    const config: Config = {
      settings: {
        apiKey,
        apiSecret,
        userIdentities: { customer_id: 'user.id' },
      },
      mapping: {
        order: {
          complete: {
            settings: {
              eventType: 'commerce_event',
              commerce: {
                map: {
                  currency_code: 'data.currency',
                  product_action: {
                    map: {
                      action: { value: 'purchase' },
                      transaction_id: 'data.id',
                      total_amount: 'data.total',
                    },
                  },
                },
              },
            },
          },
        },
      } as Rules,
    };
    await pushViaFlow(event, config);

    const parsed = JSON.parse(mockSendServer.mock.calls[0][1] as string);
    expect(parsed.events[0].event_type).toBe('commerce_event');
    expect(parsed.events[0].data.currency_code).toBe('USD');
    expect(parsed.events[0].data.product_action).toEqual({
      action: 'purchase',
      transaction_id: 'ORD-1',
      total_amount: 99.99,
    });
  });

  test('customEventType overrides the default category', async () => {
    const event = getEvent('product view', {
      timestamp: 1700000400000,
      user: { id: 'u1' },
    });
    const config: Config = {
      settings: { apiKey, apiSecret },
      mapping: {
        product: {
          view: { settings: { customEventType: 'navigation' } },
        },
      } as Rules,
    };
    await pushViaFlow(event, config);
    const parsed = JSON.parse(mockSendServer.mock.calls[0][1] as string);
    expect(parsed.events[0].data.custom_event_type).toBe('navigation');
  });

  test('uses pod-specific endpoint for eu1', async () => {
    const event = getEvent('product view', { user: { id: 'u1' } });
    await pushWith(event, {
      settings: { apiKey, apiSecret, pod: 'eu1' },
    });
    expect(mockSendServer.mock.calls[0][0]).toBe(
      'https://s2s.eu1.mparticle.com/v2/events',
    );
  });

  test('throws when sendServer returns ok: false', async () => {
    mockSendServer.mockResolvedValue({ ok: false, error: 'Bad Request' });
    const event = getEvent('product view', { user: { id: 'u1' } });
    await expect(
      pushWith(event, { settings: { apiKey, apiSecret } }),
    ).rejects.toThrow(/mParticle API error/);
  });

  test('rule.name overrides event name for custom_event', async () => {
    const event = getEvent('product view', {
      timestamp: 1700000500000,
      user: { id: 'u1' },
    });
    const config: Config = {
      settings: { apiKey, apiSecret },
      mapping: {
        product: { view: { name: 'ProductViewed' } },
      } as Rules,
    };
    await pushViaFlow(event, config);
    const parsed = JSON.parse(mockSendServer.mock.calls[0][1] as string);
    expect(parsed.events[0].data.event_name).toBe('ProductViewed');
  });

  test('source_request_id defaults to event.id when not set', async () => {
    const event = getEvent('product view', {
      timestamp: 1700000600000,
      user: { id: 'u1' },
    });
    await pushWith(event, { settings: { apiKey, apiSecret } });
    const parsed = JSON.parse(mockSendServer.mock.calls[0][1] as string);
    expect(parsed.source_request_id).toBe(event.id);
  });

  test('init fails when apiKey missing', async () => {
    const mockCollector = {} as Collector.Instance;
    await expect(
      destination.init({
        config: {},
        collector: mockCollector,
        env: testEnv,
        logger: createMockLogger(),
        id: 'test-mparticle',
      }),
    ).rejects.toThrow('Config settings apiKey missing');
  });
});
