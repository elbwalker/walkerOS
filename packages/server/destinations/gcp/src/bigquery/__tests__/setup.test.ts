import type { Config, Env, SetupSchemaField } from '../types';
import { BigQuery } from '@google-cloud/bigquery';
import { __setSetupHarness, __resetSetupHarness } from '@google-cloud/bigquery';
import { createMockLogger } from '@walkeros/core';
import { setup, DEFAULT_SCHEMA, DEFAULT_SETUP } from '../setup';

jest.mock('@google-cloud/bigquery');

const DECLARED_SCHEMA: SetupSchemaField[] = DEFAULT_SETUP.schema;

function makeConfig(): Config {
  return {
    settings: {
      client: new BigQuery(),
      projectId: 'p',
      datasetId: 'd',
      tableId: 't',
      location: 'EU',
    },
    setup: true,
  };
}

const env: Env = {};

describe('setup', () => {
  beforeEach(() => {
    __resetSetupHarness();
  });

  test('creates dataset and table when both missing', async () => {
    __setSetupHarness({ datasetExists: false, tableExists: false });
    const logger = createMockLogger();

    const result = await setup({
      id: 'bq',
      config: makeConfig(),
      env,
      logger,
    });

    expect(result).toEqual({ datasetCreated: true, tableCreated: true });
    expect(logger.warn).not.toHaveBeenCalled();
  });

  test('skips dataset creation when it exists, creates table when missing', async () => {
    __setSetupHarness({ datasetExists: true, tableExists: false });
    const logger = createMockLogger();

    const result = await setup({
      id: 'bq',
      config: makeConfig(),
      env,
      logger,
    });

    expect(result).toEqual({ datasetCreated: false, tableCreated: true });
  });

  test('idempotent when both exist (no creates, no warnings)', async () => {
    __setSetupHarness({
      datasetExists: true,
      tableExists: true,
      tableMetadata: {
        timePartitioning: { type: 'DAY', field: 'timestamp' },
        clustering: { fields: ['name', 'entity', 'action'] },
        schema: {
          fields: DECLARED_SCHEMA.map((f) => ({
            name: f.name,
            type: f.type,
            mode: f.mode,
          })),
        },
      },
    });
    const logger = createMockLogger();

    const result = await setup({
      id: 'bq',
      config: makeConfig(),
      env,
      logger,
    });

    expect(result).toEqual({ datasetCreated: false, tableCreated: false });
    expect(logger.warn).not.toHaveBeenCalled();
  });

  test('treats 409 from dataset.create as success', async () => {
    __setSetupHarness({
      datasetExists: false,
      tableExists: false,
      datasetCreateError: { code: 409, message: 'Already Exists' },
    });
    const logger = createMockLogger();

    const result = await setup({
      id: 'bq',
      config: makeConfig(),
      env,
      logger,
    });

    // Race: dataset created concurrently between exists() and create().
    // setup must not throw. datasetCreated stays false (we did not create it).
    expect(result).toEqual({ datasetCreated: false, tableCreated: true });
  });

  describe('drift detection (warns, does not mutate)', () => {
    test('5a: partition drift (declared DAY, actual HOUR) warns with field=timePartitioning', async () => {
      __setSetupHarness({
        datasetExists: true,
        tableExists: true,
        tableMetadata: {
          timePartitioning: { type: 'HOUR', field: 'timestamp' },
          clustering: { fields: ['name', 'entity', 'action'] },
          schema: {
            fields: DECLARED_SCHEMA.map((f) => ({
              name: f.name,
              type: f.type,
              mode: f.mode,
            })),
          },
        },
      });
      const logger = createMockLogger();

      const result = await setup({
        id: 'bq',
        config: makeConfig(),
        env,
        logger,
      });

      expect(result).toEqual({ datasetCreated: false, tableCreated: false });
      expect(logger.warn).toHaveBeenCalledTimes(1);
      expect(logger.warn).toHaveBeenCalledWith(
        'setup.drift',
        expect.objectContaining({
          field: 'timePartitioning',
          declared: { type: 'DAY', field: 'timestamp' },
          actual: { type: 'HOUR', field: 'timestamp' },
        }),
      );
    });

    test('5b: clustering drift (declared [name, entity, action], actual [user]) warns with field=clustering', async () => {
      __setSetupHarness({
        datasetExists: true,
        tableExists: true,
        tableMetadata: {
          timePartitioning: { type: 'DAY', field: 'timestamp' },
          clustering: { fields: ['user'] },
          schema: {
            fields: DECLARED_SCHEMA.map((f) => ({
              name: f.name,
              type: f.type,
              mode: f.mode,
            })),
          },
        },
      });
      const logger = createMockLogger();

      await setup({
        id: 'bq',
        config: makeConfig(),
        env,
        logger,
      });

      expect(logger.warn).toHaveBeenCalledTimes(1);
      expect(logger.warn).toHaveBeenCalledWith(
        'setup.drift',
        expect.objectContaining({
          field: 'clustering',
          declared: { fields: ['name', 'entity', 'action'] },
          actual: { fields: ['user'] },
        }),
      );
    });

    test('5c: schema drift (missing consent column) warns with field=schema', async () => {
      const driftedFields = DECLARED_SCHEMA.filter(
        (f) => f.name !== 'consent',
      ).map((f) => ({ name: f.name, type: f.type, mode: f.mode }));
      __setSetupHarness({
        datasetExists: true,
        tableExists: true,
        tableMetadata: {
          timePartitioning: { type: 'DAY', field: 'timestamp' },
          clustering: { fields: ['name', 'entity', 'action'] },
          schema: { fields: driftedFields },
        },
      });
      const logger = createMockLogger();

      await setup({
        id: 'bq',
        config: makeConfig(),
        env,
        logger,
      });

      expect(logger.warn).toHaveBeenCalledTimes(1);
      expect(logger.warn).toHaveBeenCalledWith(
        'setup.drift',
        expect.objectContaining({
          field: 'schema',
          declared: DECLARED_SCHEMA.map((f) => ({
            name: f.name,
            type: f.type,
            mode: f.mode,
          })),
          actual: driftedFields.map((f) => ({
            name: f.name,
            type: f.type,
            mode: f.mode,
          })),
        }),
      );
    });
  });

  test('DEFAULT_SCHEMA has only `name` REQUIRED', () => {
    const required = DEFAULT_SCHEMA.filter((f) => f.mode === 'REQUIRED');
    expect(required).toHaveLength(1);
    expect(required[0].name).toBe('name');
  });
});
