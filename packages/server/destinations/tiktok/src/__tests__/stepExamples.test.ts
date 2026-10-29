import type { WalkerOS } from '@walkeros/core';
import { startFlow } from '@walkeros/collector';
import { clone, isObject } from '@walkeros/core';
import { examples } from '../dev';
import { expectSimulationResolves } from '@walkeros/core/dev';

type Captured = [callable: string, ...args: unknown[]];

/**
 * TikTok Events API destination invokes `env.sendServer(url, body, options)`
 * exactly once per push. The destination is stateless; each event becomes
 * one HTTP request.
 */
describe('Step Examples', () => {
  const mockSendServer = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockSendServer.mockResolvedValue({
      data: JSON.stringify({ code: 0, message: 'OK' }),
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
        settings: { accessToken: 's3cr3t', pixelCode: 'PIXEL_CODE' },
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

it("uses no event name missing from TikTok's standard events list", () => {
  const missing = ['ClickButton', 'CompletePayment', 'PlaceAnOrder'];
  for (const example of Object.values(examples.step)) {
    const name = isObject(example.mapping) ? example.mapping.name : undefined;
    expect(missing).not.toContain(name);
  }
});
