import type { WalkerOS } from '@walkeros/core';
import { clone } from '@walkeros/core';
import { startFlow } from '@walkeros/collector';
import { examples } from '../dev';

type Captured = [callable: string, ...args: unknown[]];

/**
 * mParticle Events API invokes `env.sendServer(url, body, options)` exactly
 * once per push. Stateless — no init-time calls to filter.
 *
 * The base settings pin `apiKey`/`apiSecret` and resolve `customer_id` from
 * `user.id`; when `user.email` is present we also map `email`. Every example
 * is compared byte-for-byte against the stringified batch in `example.out`.
 */
describe('Step Examples', () => {
  const mockSendServer = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockSendServer.mockResolvedValue({ ok: true, data: {} });
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
          apiKey: 'key',
          apiSecret: 'secret',
          userIdentities: {
            customer_id: 'user.id',
            ...(event.user?.email ? { email: 'user.email' } : {}),
          },
        },
        mapping: mappingConfig,
      },
    );

    await elb(event);

    const captured: Captured[] = mockSendServer.mock.calls.map(
      (args) => ['sendServer', ...args] as Captured,
    );

    expect(captured).toEqual(example.out);
  });
});
