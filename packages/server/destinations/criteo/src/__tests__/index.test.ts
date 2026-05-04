import type { WalkerOS, Collector } from '@walkeros/core';
import type { Config, Destination, Settings } from '../types';
import {
  clone,
  getEvent,
  createMockContext,
  createMockLogger,
} from '@walkeros/core';
import { startFlow } from '@walkeros/collector';
import { examples } from '../dev';
import { DEFAULT_URL } from '../config';

const { env } = examples;

describe('Server Destination Criteo', () => {
  let destination: Destination;
  let elb: WalkerOS.Elb;
  const partnerId = '12345';
  const callerId = 'CALLER_ABC';
  const mockSendServer = jest.fn();

  const testEnv = clone(env.push);
  testEnv.sendServer = mockSendServer;

  beforeEach(async () => {
    jest.clearAllMocks();

    mockSendServer.mockResolvedValue({
      ok: true,
      data: 'OK',
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
      id: 'test-criteo',
    })) as Config;
  }

  test('init - missing partnerId throws', async () => {
    const mockCollector = {} as Collector.Instance;
    await expect(
      destination.init({
        config: {},
        collector: mockCollector,
        env: testEnv,
        logger: createMockLogger(),
        id: 'test-criteo',
      }),
    ).rejects.toThrow('Config settings partnerId missing');
  });

  test('init - missing callerId throws', async () => {
    const mockCollector = {} as Collector.Instance;
    await expect(
      destination.init({
        config: { settings: { partnerId } as Settings },
        collector: mockCollector,
        env: testEnv,
        logger: createMockLogger(),
        id: 'test-criteo',
      }),
    ).rejects.toThrow('Config settings callerId missing');
  });

  test('init - valid settings returns config with defaults', async () => {
    const config = await getConfig({ partnerId, callerId });
    expect(config).toEqual(
      expect.objectContaining({
        settings: {
          partnerId,
          callerId,
          siteType: 'd',
          url: DEFAULT_URL,
        },
      }),
    );
  });

  test('sends to default endpoint when url not overridden', async () => {
    const event = getEvent();
    const config: Config = { settings: { partnerId, callerId } };

    await destination.push(
      event,
      createMockContext({ config, env: testEnv, id: 'test-criteo' }),
    );

    expect(mockSendServer).toHaveBeenCalled();
    const [url, , options] = mockSendServer.mock.calls[0];
    expect(url).toBe(DEFAULT_URL);
    // Auth is in-body - no custom options/headers required.
    expect(options).toBeUndefined();
  });

  test('custom url setting overrides default endpoint', async () => {
    const event = getEvent();
    const customUrl = 'https://test.example.com/criteo/event';
    const config: Config = {
      settings: { partnerId, callerId, url: customUrl },
    };

    await destination.push(
      event,
      createMockContext({ config, env: testEnv, id: 'test-criteo' }),
    );

    const [url] = mockSendServer.mock.calls[0];
    expect(url).toBe(customUrl);
  });

  test('body includes version, account, and mapping_key', async () => {
    const event = getEvent();
    const config: Config = { settings: { partnerId, callerId } };

    await destination.push(
      event,
      createMockContext({ config, env: testEnv, id: 'test-criteo' }),
    );

    const body = JSON.parse(mockSendServer.mock.calls[0][1]);
    expect(body.version).toBe('walkeros_criteo_1.0.0');
    expect(body.account).toBe(partnerId);
    expect(body.id.mapping_key).toBe(callerId);
    expect(body.site_type).toBe('d');
  });

  test('body has events array with single event object', async () => {
    const event = getEvent();
    const config: Config = { settings: { partnerId, callerId } };

    await destination.push(
      event,
      createMockContext({ config, env: testEnv, id: 'test-criteo' }),
    );

    const body = JSON.parse(mockSendServer.mock.calls[0][1]);
    expect(Array.isArray(body.events)).toBe(true);
    expect(body.events).toHaveLength(1);
  });

  test('event includes timestamp in ISO 8601', async () => {
    const event = getEvent('page view', { timestamp: 1700000000000 });
    const config: Config = { settings: { partnerId, callerId } };

    await destination.push(
      event,
      createMockContext({ config, env: testEnv, id: 'test-criteo' }),
    );

    const body = JSON.parse(mockSendServer.mock.calls[0][1]);
    const iso = body.events[0].timestamp as string;
    expect(iso).toBe(new Date(1700000000000).toISOString());
    // Must be ISO 8601 with Z suffix
    expect(iso).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z$/);
  });

  test('event name taken from rule.name when set, else event.name', async () => {
    const event = getEvent('order complete');
    const config: Config = { settings: { partnerId, callerId } };

    await destination.push(
      event,
      createMockContext({
        config,
        env: testEnv,
        id: 'test-criteo',
        rule: { name: 'trackTransaction' },
      }),
    );

    const body = JSON.parse(mockSendServer.mock.calls[0][1]);
    expect(body.events[0].event).toBe('trackTransaction');

    jest.clearAllMocks();
    mockSendServer.mockResolvedValue({ ok: true, data: 'OK' });

    await destination.push(
      event,
      createMockContext({ config, env: testEnv, id: 'test-criteo' }),
    );

    const body2 = JSON.parse(mockSendServer.mock.calls[0][1]);
    expect(body2.events[0].event).toBe('order complete');
  });

  test('full_url taken from event.source.url', async () => {
    const event = getEvent('page view', {
      source: {
        type: 'browser',
        platform: 'web',
        url: 'https://example.com/page',
        referrer: 'https://example.com/prev',
      },
    });
    const config: Config = { settings: { partnerId, callerId } };

    await destination.push(
      event,
      createMockContext({ config, env: testEnv, id: 'test-criteo' }),
    );

    const body = JSON.parse(mockSendServer.mock.calls[0][1]);
    expect(body.full_url).toBe('https://example.com/page');
    expect(body.previous_url).toBe('https://example.com/prev');
  });

  test('user_data mapping resolves mapped_user_id and retailer_visitor_id', async () => {
    const event = getEvent('page view', {
      user: { id: 'user-123', device: 'device-456' },
    });
    const config: Config = {
      settings: {
        partnerId,
        callerId,
        user_data: {
          mapped_user_id: 'user.id',
          retailer_visitor_id: 'user.device',
        },
      },
    };

    await destination.push(
      event,
      createMockContext({ config, env: testEnv, id: 'test-criteo' }),
    );

    const body = JSON.parse(mockSendServer.mock.calls[0][1]);
    expect(body.id.mapped_user_id).toBe('user-123');
    expect(body.retailer_visitor_id).toBe('device-456');
  });

  test('raw email is hashed into md5, sha256, sha256_md5', async () => {
    const event = getEvent('form submit', {
      user: { email: 'user@example.com' },
    });
    const config: Config = {
      settings: {
        partnerId,
        callerId,
        user_data: { email: 'user.email' },
      },
    };

    await destination.push(
      event,
      createMockContext({ config, env: testEnv, id: 'test-criteo' }),
    );

    const body = JSON.parse(mockSendServer.mock.calls[0][1]);
    const emailHashes = body.id.email;
    expect(emailHashes).toBeDefined();
    expect(emailHashes.md5).toMatch(/^[a-f0-9]{32}$/);
    expect(emailHashes.sha256).toMatch(/^[a-f0-9]{64}$/);
    expect(emailHashes.sha256_md5).toMatch(/^[a-f0-9]{64}$/);
    expect(emailHashes.raw).toBeUndefined();
  });

  test('country and language included when set', async () => {
    const event = getEvent();
    const config: Config = {
      settings: {
        partnerId,
        callerId,
        country: 'DE',
        language: 'de',
      },
    };

    await destination.push(
      event,
      createMockContext({ config, env: testEnv, id: 'test-criteo' }),
    );

    const body = JSON.parse(mockSendServer.mock.calls[0][1]);
    expect(body.country).toBe('DE');
    expect(body.language).toBe('de');
  });

  test('country and language absent when not set', async () => {
    const event = getEvent();
    const config: Config = { settings: { partnerId, callerId } };

    await destination.push(
      event,
      createMockContext({ config, env: testEnv, id: 'test-criteo' }),
    );

    const body = JSON.parse(mockSendServer.mock.calls[0][1]);
    expect(body.country).toBeUndefined();
    expect(body.language).toBeUndefined();
  });

  test('no Authorization header set (auth is in body)', async () => {
    const event = getEvent();
    const config: Config = { settings: { partnerId, callerId } };

    await destination.push(
      event,
      createMockContext({ config, env: testEnv, id: 'test-criteo' }),
    );

    // sendServer only called with (url, body) - third arg options is undefined.
    const [, body, options] = mockSendServer.mock.calls[0];
    expect(typeof body).toBe('string');
    expect(options).toBeUndefined();
  });

  test('error response throws', async () => {
    mockSendServer.mockResolvedValue({ ok: false, error: '401' });

    const event = getEvent();
    const config: Config = { settings: { partnerId, callerId } };

    await expect(
      destination.push(
        event,
        createMockContext({ config, env: testEnv, id: 'test-criteo' }),
      ),
    ).rejects.toThrow();
  });

  test('environment customization via env.sendServer', async () => {
    const customSendServer = jest.fn();
    customSendServer.mockResolvedValue({ ok: true, data: 'OK' });

    const customEnv = { sendServer: customSendServer };
    const event = getEvent();
    const config: Config = { settings: { partnerId, callerId } };

    await destination.push(
      event,
      createMockContext({ config, env: customEnv, id: 'test-criteo' }),
    );

    expect(customSendServer).toHaveBeenCalled();
    expect(mockSendServer).not.toHaveBeenCalled();
  });

  test('integration - init + push via startFlow', async () => {
    const dest = jest.requireActual('../').default;
    const event = getEvent('order complete', {
      timestamp: 1700000900000,
      data: { id: 'ORD-1', total: 100, currency: 'EUR' },
      nested: [
        {
          entity: 'product',
          data: { id: 'SKU-1', price: 50, quantity: 2 },
        },
      ],
      source: {
        type: 'browser',
        platform: 'web',
        url: 'https://example.com/checkout/complete',
      },
    });

    elb(
      'walker destination',
      { ...dest, env: testEnv },
      {
        settings: { partnerId, callerId },
        mapping: {
          order: {
            complete: {
              name: 'trackTransaction',
              data: {
                map: {
                  id: 'data.id',
                },
              },
            },
          },
        },
      },
    );

    await elb(event);

    expect(mockSendServer).toHaveBeenCalledTimes(1);
    const [url, bodyStr] = mockSendServer.mock.calls[0];
    expect(url).toBe(DEFAULT_URL);
    const body = JSON.parse(bodyStr);
    expect(body.events[0].event).toBe('trackTransaction');
    expect(body.events[0].id).toBe('ORD-1');
    expect(body.account).toBe(partnerId);
    expect(body.id.mapping_key).toBe(callerId);
  });
});
