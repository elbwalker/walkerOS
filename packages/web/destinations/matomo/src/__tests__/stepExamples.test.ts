import type {
  Destination,
  WalkerOS,
  Mapping as WalkerOSMapping,
} from '@walkeros/core';
import { startFlow } from '@walkeros/collector';
import { clone } from '@walkeros/core';
import { examples } from '../dev';

type CallRecord = [string, ...unknown[]];

const initConfig = examples.step.init.in as Destination.Config;
const initOut = (examples.step.init.out ?? []) as ReadonlyArray<CallRecord>;

const noopLogger = {
  log: () => {},
  warn: () => {},
  error: () => {},
  debug: () => {},
  throw: (msg: string) => {
    throw new Error(msg);
  },
} as unknown as Destination.Context['logger'];

function makeMockPaq(): {
  mockPaq: Array<unknown> & { push: jest.Mock };
  calls: CallRecord[];
} {
  const calls: CallRecord[] = [];
  const mockPaq = [] as unknown as Array<unknown> & { push: jest.Mock };
  mockPaq.push = jest.fn((...args: unknown[]) => {
    calls.push(['_paq.push', args[0]]);
    return calls.length;
  });
  return { mockPaq, calls };
}

describe('matomo web destination -- step examples', () => {
  const stepEntries = Object.entries(examples.step).filter(
    ([name]) => name !== 'init',
  );

  it('init', async () => {
    const { mockPaq, calls } = makeMockPaq();
    const env = clone(examples.env.push);
    env.window._paq = mockPaq;

    const dest = jest.requireActual('../').default;

    await dest.init({
      id: 'matomo',
      config: initConfig,
      env,
      logger: noopLogger,
      collector: {} as Destination.Context['collector'],
    });

    expect(calls).toEqual(initOut);
  });

  it.each(stepEntries)('%s', async (_name, example) => {
    const mapping = example.mapping as WalkerOSMapping.Rule | undefined;
    const event = example.in as WalkerOS.Event;

    const { mockPaq, calls } = makeMockPaq();
    const env = clone(examples.env.push);
    env.window._paq = mockPaq;

    const dest = jest.requireActual('../').default;
    const { elb } = await startFlow({ tagging: 2 });

    const mappingConfig = mapping
      ? { [event.entity]: { [event.action]: mapping } }
      : undefined;

    await elb(
      'walker destination',
      { ...dest, env },
      { ...initConfig, mapping: mappingConfig },
    );

    await elb(event);

    const expected = (example.out ?? []) as ReadonlyArray<CallRecord>;
    const actual = calls.slice(initOut.length);
    expect(actual).toEqual(expected);
  });
});
