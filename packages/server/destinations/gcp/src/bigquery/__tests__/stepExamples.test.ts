import type { Collector, WalkerOS } from '@walkeros/core';
import type { Config, Destination, Settings } from '../types';
import { clone, createMockContext, createMockLogger } from '@walkeros/core';
import * as examples from '../examples';

const { env } = examples;

type CallRecord = [string, ...unknown[]];

describe('Step Examples', () => {
  beforeAll(() => {
    // Lock Date so push.ts createdAt = new Date() is deterministic and
    // matches examples/step.ts FIXED_NOW.
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2024-01-01T00:00:00.000Z'));
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  it.each(Object.entries(examples.step))('%s', async (_name, example) => {
    const calls: CallRecord[] = [];

    const destination: Destination = jest.requireActual('../').default;
    destination.config = {};

    const testEnv = clone(env.push);
    testEnv.BigQuery = class MockBigQuery {
      options: unknown;
      private datasetId?: string;
      private tableId?: string;
      constructor(options?: unknown) {
        this.options = options;
      }
      dataset(datasetId: string) {
        this.datasetId = datasetId;
        return this;
      }
      table(tableId: string) {
        this.tableId = tableId;
        return this;
      }
      async insert(rows: unknown[]) {
        calls.push([
          'dataset.table.insert',
          this.datasetId as unknown,
          this.tableId as unknown,
          rows,
        ]);
      }
    } as unknown as typeof testEnv.BigQuery;

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

    expect(calls).toEqual(example.out);
  });
});
