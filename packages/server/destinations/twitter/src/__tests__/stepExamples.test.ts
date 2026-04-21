import type { WalkerOS } from '@walkeros/core';
import { startFlow } from '@walkeros/collector';
import { clone, isObject } from '@walkeros/core';
import { examples } from '../dev';

type Captured = [callable: string, ...args: unknown[]];

/**
 * X (Twitter) Conversions API destination invokes
 * `env.sendServer(url, body, options)` once per push. OAuth 1.0a signing is
 * non-deterministic (fresh nonce + timestamp per call), so we normalize the
 * `Authorization` header to a stable marker before comparing. Other header
 * fields and the request body are byte-compared.
 */
describe('Step Examples', () => {
  const mockSendServer = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockSendServer.mockResolvedValue({
      ok: true,
      data: { request_id: 'mock-request-id' },
    });
  });

  it.each(Object.entries(examples.step))('%s', async (_name, example) => {
    const event = example.in as WalkerOS.Event;
    const mapping = example.mapping;

    const testEnv = clone(examples.env.push);
    testEnv.sendServer = mockSendServer;

    const dest = jest.requireActual('../').default;
    const { elb } = await startFlow({ tagging: 2 });

    const mappingConfig = mapping
      ? { [event.entity]: { [event.action]: mapping } }
      : undefined;

    await elb(
      'walker destination',
      { ...dest, env: testEnv },
      {
        settings: {
          pixelId: 'o8z6j',
          eventId: 'tw-o8z6j-o8z21',
          consumerKey: 'consumer-key',
          consumerSecret: 'consumer-secret',
          accessToken: 'access-token',
          accessTokenSecret: 'access-token-secret',
        },
        mapping: mappingConfig,
      },
    );

    await elb(event);

    // Normalize the OAuth Authorization header (non-deterministic) to the
    // stable placeholder used in the example's expected `out`.
    const captured: Captured[] = mockSendServer.mock.calls.map((args) => {
      const [url, body, options] = args as [unknown, unknown, unknown];
      if (isObject(options) && isObject(options.headers)) {
        const headers = options.headers as Record<string, unknown>;
        if (typeof headers.Authorization === 'string') {
          return [
            'sendServer',
            url,
            body,
            {
              ...options,
              headers: { ...headers, Authorization: '<OAUTH_SIGNATURE>' },
            },
          ] as Captured;
        }
      }
      return ['sendServer', url, body, options] as Captured;
    });

    expect(captured).toEqual(example.out);
  });
});
