import type { Flow, WalkerOS } from '@walkeros/core';
import { runInNewContext } from 'vm';
import { startFlow } from '@walkeros/collector';
import { clone, isObject } from '@walkeros/core';
import { examples } from '../dev';
import { expectSimulationResolves } from '@walkeros/core/dev';

type Captured = [callable: string, ...args: unknown[]];

// Functions in examples are published as `{ $code: fn.toString() }` in
// walkerOS.json and evaluated without the module scope they were written in.
function serializeMapping(
  mapping: Flow.StepExample['mapping'],
): Flow.StepExample['mapping'] {
  if (mapping === undefined) return mapping;
  return JSON.parse(
    JSON.stringify(mapping, (_, value) =>
      typeof value === 'function' ? { $code: value.toString() } : value,
    ),
    (_, value) =>
      isObject(value) && typeof value.$code === 'string'
        ? runInNewContext(`(${value.$code})`)
        : value,
  );
}

/**
 * Meta Conversions API destination invokes `env.sendServer(url, body)` exactly
 * once per push. There are no init-time calls to filter - the destination is
 * stateless; each event becomes one HTTP request.
 */
describe('Step Examples', () => {
  const mockSendServer = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockSendServer.mockResolvedValue({
      ok: true,
      data: { events_received: 1, messages: [], fbtrace_id: 'abc' },
    });
  });

  async function run(
    example: Flow.StepExample,
    mapping: Flow.StepExample['mapping'],
  ) {
    const event = example.in as WalkerOS.Event;

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
        settings: { accessToken: 's3cr3t', pixelId: '1234567890' },
        mapping: mappingConfig,
      },
    });

    await elb(event);

    return mockSendServer.mock.calls.map(
      (args) => ['sendServer', ...args] as Captured,
    );
  }

  it.each(Object.entries(examples.step))('%s', async (name, example) => {
    expect(await run(example, example.mapping)).toEqual(example.out);
  });

  it.each(Object.entries(examples.step))(
    '%s works with serialized functions',
    async (name, example) => {
      expect(await run(example, serializeMapping(example.mapping))).toEqual(
        example.out,
      );
    },
  );
});

it('declares simulation paths that resolve', () =>
  expectSimulationResolves(examples.env));
