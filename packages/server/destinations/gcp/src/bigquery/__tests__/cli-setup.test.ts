import type { Settings } from '../types';
import {
  BigQuery,
  __setSetupHarness,
  __resetSetupHarness,
} from '@google-cloud/bigquery';
import { createMockLogger } from '@walkeros/core';
import destination from '..';

jest.mock('@google-cloud/bigquery');

describe('CLI setup wiring', () => {
  beforeEach(() => {
    __resetSetupHarness();
  });

  test('default export exposes a setup function', () => {
    expect(typeof destination.setup).toBe('function');
  });

  test('default export exposes pushBatch', () => {
    expect(typeof destination.pushBatch).toBe('function');
  });

  test('default export exposes destroy', () => {
    expect(typeof destination.destroy).toBe('function');
  });

  test('setup callable with a CLI-shaped LifecycleContext', async () => {
    if (!destination.setup) throw new Error('setup missing');

    // Program the harness so both dataset and table exist, with declared
    // partitioning/clustering/schema. The destination's setup walks through
    // dataset.exists() -> table.exists() -> getMetadata() and reports back.
    __setSetupHarness({
      datasetExists: true,
      tableExists: true,
      tableMetadata: {
        timePartitioning: { type: 'DAY', field: 'timestamp' },
        clustering: { fields: ['name', 'entity', 'action'] },
        schema: { fields: [] },
      },
    });

    const settings: Settings = {
      client: new BigQuery(),
      projectId: 'p',
      datasetId: 'walkerOS',
      tableId: 'events',
      location: 'EU',
    };

    const result = await destination.setup({
      id: 'bq',
      config: {
        settings,
        setup: true,
      },
      env: {},
      logger: createMockLogger(),
    });

    // Both already exist, so neither was created.
    expect(result).toEqual({ datasetCreated: false, tableCreated: false });
  });
});
