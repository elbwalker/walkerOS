import type { Flow, WalkerOS } from '@walkeros/core';
import { startFlow } from '@walkeros/collector';
import { clone, isArray, isObject, isString } from '@walkeros/core';
import { examples } from '../dev';
import { expectSimulationResolves } from '@walkeros/core/dev';

type Captured = [callable: string, ...args: unknown[]];

/**
 * Bing UET CAPI destination invokes `env.sendServer(url, body, options)`
 * exactly once per push. Stateless - no init-time calls to filter.
 */
describe('Step Examples', () => {
  const mockSendServer = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockSendServer.mockResolvedValue({
      data: JSON.stringify({ status: 'OK', requestId: 'req-1' }),
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
        settings: { accessToken: 's3cr3t', tagId: 'UET-12345' },
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

// Microsoft requires at least one of these identifiers in the userData of
// every event, and asks never to receive a real user ID.
const microsoftIdentifiers = [
  'em',
  'ph',
  'anonymousId',
  'externalId',
  'msclkid',
  'idfa',
  'gaid',
];

function sentEvents(example: Flow.StepExample): unknown[] {
  if (!isArray<unknown>(example.out)) return [];
  return example.out.flatMap((call) => {
    if (!isArray<unknown>(call) || !isString(call[2])) return [];
    const body: unknown = JSON.parse(call[2]);
    return isObject(body) && isArray<unknown>(body.data) ? body.data : [];
  });
}

describe('Step example identifiers', () => {
  const published = Object.entries(examples.step).filter(
    ([, example]) => example.public !== false,
  );

  it.each(published)(
    '%s sends a Microsoft identifier and never the raw user id',
    (_name, example) => {
      const events = sentEvents(example);
      expect(events.length).toBeGreaterThan(0);

      const userId =
        isObject(example.in) && isObject(example.in.user)
          ? example.in.user.id
          : undefined;

      for (const sent of events) {
        const userData =
          isObject(sent) && isObject(sent.userData) ? sent.userData : {};
        expect(
          microsoftIdentifiers.filter((key) => key in userData),
        ).not.toEqual([]);
        if (userId !== undefined)
          expect(Object.values(userData)).not.toContain(userId);
      }
    },
  );
});
