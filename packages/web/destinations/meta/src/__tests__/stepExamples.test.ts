import type {
  Destination,
  WalkerOS,
  Mapping as WalkerOSMapping,
} from '@walkeros/core';
import { startFlow } from '@walkeros/collector';
import { clone, createLogger } from '@walkeros/core';
import { examples } from '../dev';

type CallRecord = [string, ...unknown[]];

const initConfig = examples.step.init.in as Destination.Config;
const initOut = (examples.step.init.out ?? []) as ReadonlyArray<CallRecord>;

const noopLogger = createLogger();

describe('meta web destination -- step examples', () => {
  const stepEntries = Object.entries(examples.step).filter(
    ([name]) => name !== 'init',
  );

  it('init', async () => {
    const mockFbq = jest.fn();
    const calls: CallRecord[] = [];
    mockFbq.mockImplementation((...args: unknown[]) => {
      calls.push(['fbq', ...args]);
    });
    const env = clone(examples.env.push);
    env.window.fbq = mockFbq;
    env.window._fbq = mockFbq;

    const dest = jest.requireActual('../').default;

    await dest.init({
      id: 'meta',
      config: initConfig,
      env,
      logger: noopLogger,
      collector: {} as Destination.Context['collector'],
    });

    expect(calls).toEqual(initOut);
  });

  it.each(stepEntries)('%s', async (_name, example) => {
    const event = example.in as WalkerOS.Event;
    const mapping = example.mapping as WalkerOSMapping.Rule | undefined;

    const mockFbq = jest.fn();
    const calls: CallRecord[] = [];
    mockFbq.mockImplementation((...args: unknown[]) => {
      calls.push(['fbq', ...args]);
    });
    const env = clone(examples.env.push);
    env.window.fbq = mockFbq;
    env.window._fbq = mockFbq;

    const dest = jest.requireActual('../').default;
    const { elb } = await startFlow();

    const mappingConfig = mapping
      ? { [event.entity]: { [event.action]: mapping } }
      : undefined;

    await elb('walker destination', {
      code: { ...dest, env },
      config: { ...initConfig, mapping: mappingConfig },
    });

    await elb(event);

    const expected = (example.out ?? []) as ReadonlyArray<CallRecord>;
    const actual = calls.slice(initOut.length);
    expect(actual).toEqual(expected);
  });
});
