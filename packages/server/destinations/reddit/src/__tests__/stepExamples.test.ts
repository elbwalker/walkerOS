import type { WalkerOS } from '@walkeros/core';
import { startFlow } from '@walkeros/collector';
import { clone, isObject } from '@walkeros/core';
import { examples } from '../dev';
import { expectSimulationResolves } from '@walkeros/core/dev';

type Captured = [callable: string, ...args: unknown[]];

/**
 * Reddit Conversions API destination invokes `env.sendServer(url, body, options)`
 * exactly once per push. Stateless: no init-time calls to filter.
 */
describe('Step Examples', () => {
  const mockSendServer = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockSendServer.mockResolvedValue({
      data: { success: true },
    });
  });

  // Non-public examples (silent, failures) run in the conformance test.
  const published = Object.entries(examples.step).filter(
    ([, example]) => example.public !== false,
  );

  it.each(published)('%s', async (_name, example) => {
    const event = example.in as WalkerOS.Event;
    const mapping = example.mapping;

    const testEnv = clone(examples.env.push);
    testEnv.sendServer = mockSendServer;

    const dest = jest.requireActual('../').default;
    const { elb } = await startFlow();

    const mappingConfig = mapping
      ? { [event.entity]: { [event.action]: mapping } }
      : undefined;

    await elb('walker destination', {
      code: { ...dest, env: testEnv },
      config: {
        settings: { accessToken: 's3cr3t', pixelId: 'a2_abcdef123456' },
        mapping: mappingConfig,
      },
    });

    await elb(event);

    const captured: Captured[] = mockSendServer.mock.calls.map(
      (args) => ['sendServer', ...args] as Captured,
    );

    expect(captured).toEqual(example.out);
  });
});

it('declares simulation paths that resolve', () =>
  expectSimulationResolves(examples.env));

it('gives every example event a timestamp in milliseconds', () => {
  for (const example of Object.values(examples.step)) {
    const timestamp = isObject(example.in) ? example.in.timestamp : undefined;
    expect(timestamp).toBeGreaterThan(1e12);
  }
});
