import type { Collector, WalkerOS } from '@walkeros/core';
import type { Config, Destination, Settings } from '../types';
import { clone, createMockLogger } from '@walkeros/core';
import * as examples from '../examples';

const { env } = examples;

describe('Step Examples', () => {
  let mockInsert: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    mockInsert = jest.fn().mockResolvedValue(undefined);
  });

  it.each(Object.entries(examples.step))('%s', async (name, example) => {
    const destination: Destination = jest.requireActual('../').default;
    destination.config = {};

    const testEnv = clone(env.push);
    testEnv.BigQuery = class MockBigQuery {
      options: unknown;
      constructor(options?: unknown) {
        this.options = options;
      }
      dataset() {
        return this;
      }
      table() {
        return this;
      }
      async insert(rows: unknown[]) {
        mockInsert(rows);
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

    await destination.push(example.in as WalkerOS.Event, {
      config,
      collector: {} as Collector.Instance,
      env: testEnv,
      logger: createMockLogger(),
      id: 'test-bq',
    });

    expect(mockInsert).toHaveBeenCalledTimes(1);
    const rows = mockInsert.mock.calls[0][0];
    expect(rows).toHaveLength(1);

    // BigQuery without mapping sends full event flattened (objects→JSON strings)
    // Step example out shows event.data fields; verify they're in the row
    const row = rows[0];
    const expectedOut = example.out as Record<string, unknown>;

    // The row's data field is JSON.stringified; parse and check fields match
    const rowData =
      typeof row.data === 'string' ? JSON.parse(row.data) : row.data;
    for (const [key, value] of Object.entries(expectedOut)) {
      if (typeof value === 'string' && key !== 'items') {
        expect(rowData[key]).toBe(value);
      }
    }
    // Verify event name is in the row
    expect(row.name).toBe((example.in as { name: string }).name);
  });
});
