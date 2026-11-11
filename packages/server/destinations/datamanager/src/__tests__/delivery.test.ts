import type { Ingest, Mapping } from '@walkeros/core';
import {
  clone,
  createIngest,
  getEvent,
  isObject,
  Logger,
  StepError,
} from '@walkeros/core';
import { startFlow } from '@walkeros/collector';
import { GoogleAuth } from 'google-auth-library';
import { destinationDataManager } from '..';
import { examples } from '../dev';
import type { Env, Rule } from '../types';

// Only the init row creates a client: it must fail without reaching Google.
jest.mock('google-auth-library');

type Line = [level: Logger.Level, message: string, context: unknown];

function isRule(value: unknown): value is Rule {
  return isObject(value);
}

const rule = examples.step.purchase.mapping;
const mapping = isRule(rule) ? { order: { complete: rule } } : undefined;

const event = getEvent('order complete', {
  id: 'ev-1',
  data: { id: 'ORD-1', value: 9.5, currency: 'EUR' },
});

/** One push through a real collector; the destination's env is the seam. */
async function run(
  env: Env,
  config: {
    timeout?: number;
    mapping?: { order: { complete: Rule } };
    settings?: Record<string, unknown>;
  } = {},
  input = event,
  ingest?: Partial<Ingest>,
) {
  const lines: Line[] = [];
  const handler: Logger.Handler = (level, message, context) => {
    lines.push([level, message, context]);
  };
  const { collector } = await startFlow({
    logger: { level: 'ERROR', handler },
    destinations: {
      datamanager: {
        code: destinationDataManager,
        config: { settings: examples.minimal.settings, mapping, ...config },
        env,
      },
    },
  });
  const result = await collector.push(
    input,
    ingest ? { ingest: { ...createIngest('test'), ...ingest } } : undefined,
  );
  await collector.command('shutdown');
  return { result, lines };
}

function envWith(sendServer: Env['sendServer']): Env {
  const env = clone(examples.env.push);
  env.sendServer = sendServer;
  return env;
}

describe('delivery', () => {
  const realFetch = globalThis.fetch;

  beforeEach(() => {
    globalThis.fetch = jest.fn(() => {
      throw new Error('a test reached the network');
    });
  });

  afterEach(() => {
    globalThis.fetch = realFetch;
  });

  it.each([
    ['not JSON', '<html>'],
    ['JSON null', null],
  ])('a 2xx body that is %s fails, not retried', async (_, data) => {
    const { result } = await run(
      envWith(jest.fn().mockResolvedValue({ data })),
    );

    expect(result.failed?.datamanager?.reason).toMatchObject({
      code: 'transport',
      retryable: false,
      message: 'Data Manager answered with an unreadable body',
    });
  });

  it('an empty 2xx body is accepted', async () => {
    const { result } = await run(
      envWith(jest.fn().mockResolvedValue({ data: '' })),
    );

    expect(result.done?.datamanager).toBeDefined();
    expect(result.done?.datamanager?.data).toBeUndefined();
  });

  it.each([
    [
      'a documented warning',
      [
        {
          reason: 'WARNING_REASON_INVALID_CLIENT_ID',
          description: 'The client ID is invalid.',
          field: 'events.events[0].client_id',
        },
      ],
      'WARNING_REASON_INVALID_CLIENT_ID at events.events[0].client_id',
      ['The client ID is invalid.'],
    ],
    [
      'only unsafe warnings',
      [
        {
          reason: 'WARNING_REASON_INVALID_CLIENT_ID',
          description: 'The client ID is invalid.',
          field: 'events.events[0].clientId <jane@example.com>',
        },
        { reason: 'reason of jane@example.com' },
      ],
      '2 field warnings',
      ['The client ID is invalid.', 'jane@example.com'],
    ],
  ])(
    "Google's field warnings go on one ERROR line, the event counts: %s",
    async (_, fieldWarnings, error, unsafe) => {
      const { result, lines } = await run(
        envWith(
          jest
            .fn()
            .mockResolvedValue({ data: { requestId: 'r-1', fieldWarnings } }),
        ),
      );

      expect(result.done?.datamanager).toBeDefined();
      const errors = lines.filter(([level]) => level === Logger.Level.ERROR);
      expect(errors).toHaveLength(1);
      const [[, message, context]] = errors;
      expect(message).toMatch(/^Google accepted the event and dropped fields/);
      expect(context).toMatchObject({ code: 'field-warning', error });
      const recorded = JSON.stringify(lines);
      for (const text of unsafe) expect(recorded).not.toContain(text);
    },
  );

  it("returns Google's request id", async () => {
    const { result } = await run(
      envWith(jest.fn().mockResolvedValue({ data: { requestId: 'r-1' } })),
    );

    expect(result.done?.datamanager?.data).toEqual({ requestId: 'r-1' });
  });

  it.each([
    [409, 'ABORTED'],
    [503, 'UNAVAILABLE'],
  ])('a %i %s refusal is retried', async (status, rpcStatus) => {
    const { result } = await run(
      envWith(
        jest.fn().mockRejectedValue(
          new StepError(`HTTP ${status}`, {
            code: 'transport',
            status,
            body: { error: { code: status, status: rpcStatus, message: 'x' } },
          }),
        ),
      ),
    );

    expect(result.failed?.datamanager?.reason).toMatchObject({
      code: 'transport',
      status,
      retryable: true,
      message: `Data Manager API error (${status} ${rpcStatus})`,
    });
    expect(result.failed?.datamanager?.error).toHaveProperty(
      'body.error.status',
      rpcStatus,
    );
  });

  it('a network error is retried', async () => {
    const { result } = await run(
      envWith(
        jest
          .fn()
          .mockRejectedValue(
            new StepError('fetch failed (ECONNREFUSED)', { code: 'transport' }),
          ),
      ),
    );

    expect(result.failed?.datamanager?.reason).toMatchObject({
      code: 'transport',
      retryable: true,
    });
  });

  it('a failed header request keeps its reason', async () => {
    const env = envWith(jest.fn());
    env.authClient = {
      getRequestHeaders: jest
        .fn()
        .mockRejectedValue(new Error('invalid_grant')),
    };

    const { result } = await run(env);

    expect(result.failed?.datamanager?.reason).toMatchObject({
      code: 'transport',
      retryable: true,
      message: 'Data Manager authentication failed',
    });
  });

  it("sends the auth library's headers and the destination timeout", async () => {
    const sendServer = jest
      .fn()
      .mockResolvedValue({ data: { requestId: 'r-1' } });
    const env = envWith(sendServer);
    env.authClient = {
      getRequestHeaders: async () =>
        new Headers({
          authorization: 'Bearer t',
          'x-goog-user-project': 'my-project',
        }),
    };

    await run(env, { timeout: 2500 });

    expect(sendServer).toHaveBeenCalledTimes(1);
    expect(sendServer).toHaveBeenCalledWith(
      'https://datamanager.googleapis.com/v1/events:ingest',
      expect.any(String),
      {
        headers: {
          authorization: 'Bearer t',
          'x-goog-user-project': 'my-project',
        },
        timeout: 2500,
      },
    );
  });

  it('an init failure names the credential path', async () => {
    jest
      .mocked(GoogleAuth.prototype.getClient)
      .mockRejectedValue(new Error('Could not load the default credentials'));
    const env = envWith(jest.fn());
    env.authClient = undefined;

    const { result } = await run(env);

    expect(result.failed?.datamanager?.reason).toMatchObject({
      code: 'config',
      message:
        'Data Manager could not create an auth client from Application Default Credentials (GOOGLE_APPLICATION_CREDENTIALS, gcloud auth application-default login or the Google Cloud metadata server)',
    });
  });

  it('values it cannot send go on one ERROR line, the event is delivered', async () => {
    const sendServer = jest
      .fn()
      .mockResolvedValue({ data: { requestId: 'r-1' } });
    const dropRule: Rule = {
      data: {
        map: {
          transactionId: 'data.id',
          email: 'user.email',
          conversionValue: { value: '149.99' },
          firstName: { value: 'Jane' },
          additionalEventParameters: { map: { page: 'data.id' } },
        },
      },
    };

    const { result, lines } = await run(
      envWith(sendServer),
      { mapping: { order: { complete: dropRule } } },
      getEvent('order complete', {
        id: 'ev-1',
        data: { id: 'ORD-1' },
        user: { email: 'buyer@example.com' },
      }),
    );

    expect(result.done?.datamanager).toBeDefined();
    const [sent] = JSON.parse(sendServer.mock.calls[0][1]).events;
    expect(sent.userData.userIdentifiers).toEqual([
      { emailAddress: expect.stringMatching(/^[0-9a-f]{64}$/) },
    ]);
    expect(sent).not.toHaveProperty('conversionValue');

    const errors = lines.filter(([level]) => level === Logger.Level.ERROR);
    expect(errors).toHaveLength(1);
    const [[, message, context]] = errors;
    expect(message).toMatch(/^Data Manager did not send some mapped values/);
    expect(context).toMatchObject({
      code: 'not-sent',
      step: 'destination.datamanager',
    });
    expect(context).toHaveProperty(
      'error',
      expect.stringContaining('conversionValue (not a number)'),
    );
    expect(context).toHaveProperty(
      'error',
      expect.stringContaining(
        'additionalEventParameters (not sent by this destination)',
      ),
    );
    expect(context).toHaveProperty(
      'error',
      expect.stringContaining(
        'address (missing lastName, regionCode, postalCode)',
      ),
    );
    const recorded = JSON.stringify(lines);
    expect(recorded).not.toContain('buyer@example.com');
    expect(recorded).not.toContain('149.99');
  });

  describe('per product', () => {
    const googleAds = {
      operatingAccount: { accountId: '1234567890', accountType: 'GOOGLE_ADS' },
      productDestinationId: '987654321',
    };
    const googleAnalytics = {
      operatingAccount: {
        accountId: '123456789',
        accountType: 'GOOGLE_ANALYTICS_PROPERTY',
      },
      productDestinationId: 'G-ABC123',
    };
    type Destinations = Array<typeof googleAds | typeof googleAnalytics>;

    /** The rule of both tables: Google Analytics needs an event name. */
    const ruleFor = (destinations: Destinations, extra: Mapping.Map = {}) => ({
      order: {
        complete: {
          data: {
            map: {
              transactionId: 'data.id',
              clientId: { value: '123.456' },
              eventName: {
                value: destinations.includes(googleAnalytics)
                  ? 'sign_up'
                  : 'purchase',
              },
              ...extra,
            },
          },
        },
      },
    });

    const sentEvents = (sendServer: jest.Mock) =>
      sendServer.mock.calls.map(([, body]) => JSON.parse(body).events[0]);

    it.each<[string, Destinations, number | undefined, object]>([
      [
        'Google Ads without an id',
        [googleAds],
        undefined,
        {
          done: false,
          reason: {
            code: 'missing-input',
            message:
              'transactionId is required for a Google Ads destination: map the order ID your Google tag sends, or the event id for a conversion only the server reports',
          },
          sent: [],
        },
      ],
      [
        'Google Analytics only without an id',
        [googleAnalytics],
        undefined,
        { done: true, reason: undefined, sent: [undefined] },
      ],
      [
        'Google Ads with a number id',
        [googleAds],
        1234,
        { done: true, reason: undefined, sent: ['1234'] },
      ],
      [
        'Google Ads and Google Analytics without an id',
        [googleAds, googleAnalytics],
        undefined,
        { done: false, reason: { code: 'missing-input' }, sent: [] },
      ],
    ])(
      'transactionId per product: %s',
      async (_, destinations, id, expected) => {
        const sendServer = jest
          .fn()
          .mockResolvedValue({ data: { requestId: 'r-1' } });

        const { result } = await run(
          envWith(sendServer),
          { settings: { destinations }, mapping: ruleFor(destinations) },
          getEvent('order complete', {
            id: 'ev-1',
            data: id === undefined ? {} : { id },
          }),
        );

        expect({
          done: Boolean(result.done?.datamanager),
          reason: result.failed?.datamanager?.reason,
          sent: sentEvents(sendServer).map((sent) => sent.transactionId),
        }).toMatchObject(expected);
      },
    );

    it.each<
      [
        string,
        Destinations,
        Record<string, unknown>,
        Mapping.Map,
        Partial<Ingest> | undefined,
        unknown,
      ]
    >([
      [
        'Google Ads fills both',
        [googleAds],
        {},
        {},
        undefined,
        { ipAddress: '203.0.113.42', userAgent: 'UA/1' },
      ],
      [
        'Google Analytics only fills neither',
        [googleAnalytics],
        {},
        {},
        { ip: '198.51.100.9', userAgent: 'UA/2' },
        undefined,
      ],
      [
        'Google Analytics only sends a set ip',
        [googleAnalytics],
        { ip: 'event.user.ip' },
        {},
        undefined,
        { ipAddress: '203.0.113.42' },
      ],
      [
        'Google Analytics only sends a mapped ipAddress',
        [googleAnalytics],
        {},
        { ipAddress: { value: '198.51.100.7' } },
        undefined,
        { ipAddress: '198.51.100.7' },
      ],
      [
        'Google Ads and Google Analytics fill both',
        [googleAds, googleAnalytics],
        {},
        {},
        undefined,
        { ipAddress: '203.0.113.42', userAgent: 'UA/1' },
      ],
    ])(
      'IP and user agent per product: %s',
      async (_, destinations, settings, extra, ingest, eventDeviceInfo) => {
        const sendServer = jest
          .fn()
          .mockResolvedValue({ data: { requestId: 'r-1' } });

        await run(
          envWith(sendServer),
          {
            settings: { destinations, ...settings },
            mapping: ruleFor(destinations, extra),
          },
          getEvent('order complete', {
            id: 'ev-1',
            data: { id: 'ORD-1' },
            user: { ip: '203.0.113.42', userAgent: 'UA/1' },
          }),
          ingest,
        );

        const [sent] = sentEvents(sendServer);
        expect(sent.eventDeviceInfo).toEqual(eventDeviceInfo);
      },
    );
  });
});
