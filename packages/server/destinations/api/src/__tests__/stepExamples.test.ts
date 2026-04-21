import type { WalkerOS } from '@walkeros/core';
import { startFlow } from '@walkeros/collector';
import { clone } from '@walkeros/core';
import { examples } from '../dev';

type Captured = [callable: string, ...args: unknown[]];

/**
 * API server destination invokes `env.sendServer(url, body, options)` exactly
 * once per push. Captures calls and asserts the `['sendServer', ...args]`
 * tuple list equals the example's `out`.
 *
 * The first `out` tuple's options.headers (if present) are injected into
 * settings so the destination forwards them to sendServer.
 */
describe('Step Examples', () => {
  const mockSendServer = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockSendServer.mockResolvedValue({ ok: true });
  });

  it.each(Object.entries(examples.step))('%s', async (name, example) => {
    const event = example.in as WalkerOS.Event;
    const mapping = example.mapping;

    const testEnv = clone(examples.env.standard);
    testEnv.sendServer = mockSendServer;

    const dest = jest.requireActual('../').default;
    const { elb } = await startFlow({ tagging: 2 });

    const expectedCalls = example.out as ReadonlyArray<
      [string, string, string, { headers?: Record<string, string> }]
    >;
    const firstCall = expectedCalls[0];
    const url = firstCall[1];
    const headers = firstCall[3]?.headers;

    const mappingConfig = mapping
      ? { [event.entity]: { [event.action]: mapping } }
      : undefined;

    const settings: Record<string, unknown> = { url };
    if (headers) settings.headers = headers;

    elb(
      'walker destination',
      { ...dest, env: testEnv },
      { settings, mapping: mappingConfig },
    );

    await elb(event);

    const captured: Captured[] = mockSendServer.mock.calls.map(
      (args) => ['sendServer', ...args] as Captured,
    );

    expect(captured).toEqual(example.out);
  });
});
