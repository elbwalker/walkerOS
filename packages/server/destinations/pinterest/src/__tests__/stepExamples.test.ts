import type { WalkerOS } from '@walkeros/core';
import { startFlow } from '@walkeros/collector';
import { clone } from '@walkeros/core';
import { examples } from '../dev';

type Captured = [callable: string, ...args: unknown[]];

/**
 * Pinterest Conversions API destination invokes
 * `env.sendServer(url, body, options)` exactly once per push. Stateless —
 * no init-time calls to filter.
 */
describe('Step Examples', () => {
  const mockSendServer = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockSendServer.mockResolvedValue({
      ok: true,
      data: {
        num_events_received: 1,
        num_events_processed: 1,
        events: [{ status: 'processed' }],
      },
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
        settings: { accessToken: 's3cr3t', adAccountId: '123456789' },
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
