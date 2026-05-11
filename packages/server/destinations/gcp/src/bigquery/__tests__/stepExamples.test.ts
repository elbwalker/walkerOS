import type { Collector, WalkerOS } from '@walkeros/core';
import type { Config, Destination, Settings } from '../types';
import { clone, createMockContext, createMockLogger } from '@walkeros/core';
import {
  __getMockCalls,
  __resetMockCalls,
} from '@google-cloud/bigquery-storage';
import * as examples from '../examples';

jest.mock('@google-cloud/bigquery');
jest.mock('@google-cloud/bigquery-storage');

const { env } = examples;

type CallRecord = [string, ...unknown[]];

describe('Step Examples', () => {
  beforeAll(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2024-01-01T00:00:00.000Z'));
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  beforeEach(() => {
    __resetMockCalls();
  });

  it.each(Object.entries(examples.step))('%s', async (_name, example) => {
    const destination: Destination = jest.requireActual('../').default;
    destination.config = {};

    const testEnv = clone(env.push);

    const config = (await destination.init({
      config: {
        settings: {
          projectId: 'test-project',
          datasetId: 'test-dataset',
          tableId: 'test-table',
        } as Settings,
      },
      collector: {} as Collector.Instance,
      env: testEnv,
      logger: createMockLogger(),
      id: 'test-bq',
    })) as Config;

    await destination.push(
      example.in as WalkerOS.Event,
      createMockContext({
        config,
        env: testEnv,
        id: 'test-bq',
      }),
    );

    // Filter to only the appendRows calls produced by push().
    const calls: CallRecord[] = __getMockCalls()
      .filter((c) => c.method === 'appendRows')
      .map((c) => ['appendRows', ...c.args] as CallRecord)
      // appendRows in the mock takes (rows, offsetValue?). Drop trailing
      // undefined so the recorded shape matches the step examples.
      .map((rec) => rec.filter((v) => v !== undefined) as CallRecord);

    expect(calls).toEqual(example.out);
  });
});
