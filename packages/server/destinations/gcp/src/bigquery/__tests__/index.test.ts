import type { Collector } from '@walkeros/core';
import type {
  Config,
  Destination,
  Env,
  InitSettings,
  Settings,
} from '../types';
import { BigQuery } from '@google-cloud/bigquery';
import {
  __getMockCalls,
  __resetMockCalls,
  __setNextAppendRowErrors,
} from '@google-cloud/bigquery-storage';
import {
  clone,
  createEvent,
  createMockContext,
  createMockLogger,
} from '@walkeros/core';
import * as examples from '../examples';
import { openWriter } from '../writer';

jest.mock('@google-cloud/bigquery');
jest.mock('@google-cloud/bigquery-storage');

const { env } = examples;

describe('Server Destination BigQuery', () => {
  const event = createEvent();

  let destination: Destination;
  const projectId = 'pr0j3ct1d';
  const datasetId = 'd4t4s3t1d';
  const tableId = 't4bl31d';

  const mockCollector = {} as Collector.Instance;
  let testEnv: Env;

  async function callInit(initSettings: InitSettings) {
    if (!destination.init) throw new Error('destination.init undefined');
    return destination.init({
      config: { settings: initSettings },
      collector: mockCollector,
      env: testEnv,
      logger: createMockLogger(),
      id: 'test-bq',
    });
  }

  beforeEach(() => {
    jest.clearAllMocks();
    __resetMockCalls();

    destination = jest.requireActual('../').default;
    destination.config = {};

    testEnv = clone(env.push);
  });

  test('init opens the JSONWriter through the 5-step sequence', async () => {
    const result = await callInit({ projectId, datasetId, tableId });

    expect(result).toBeTruthy();
    if (!result) return;

    const methods = __getMockCalls().map((c) => c.method);
    expect(methods).toEqual([
      'WriterClient.ctor',
      'createStreamConnection',
      'getWriteStream',
      'adapt.convertStorageSchemaToProto2Descriptor',
      'JSONWriter.ctor',
    ]);
  });

  test('init defaults datasetId to walkerOS and tableId to events', async () => {
    const result = await callInit({ projectId });

    expect(result).toBeTruthy();
    if (!result) return;
    expect(result.settings).toMatchObject({
      projectId,
      location: 'EU',
      datasetId: 'walkerOS',
      tableId: 'events',
    });
  });

  test('init throws when projectId is missing', async () => {
    await expect(callInit({ projectId: '' })).rejects.toThrow(
      'Config settings projectId missing',
    );
  });

  test('push appends one row through JSONWriter', async () => {
    const logger = createMockLogger();
    const { writer, writeClient } = await openWriter(
      { projectId, datasetId, tableId },
      logger,
    );
    __resetMockCalls();

    const settings: Settings = {
      client: new BigQuery({ projectId }),
      projectId,
      datasetId,
      tableId,
      location: 'EU',
      writer,
      writeClient,
    };
    const config: Config = { settings };

    await destination.push(
      event,
      createMockContext({
        config,
        rule: undefined,
        data: undefined,
        env: testEnv,
        id: 'test-bq',
      }),
    );

    const append = __getMockCalls().find((c) => c.method === 'appendRows');
    expect(append).toBeDefined();
    if (!append) return;

    const rowsArg = append.args[0];
    expect(Array.isArray(rowsArg)).toBe(true);
    if (!Array.isArray(rowsArg)) return;
    expect(rowsArg).toHaveLength(1);

    const firstRow = rowsArg[0];
    expect(typeof firstRow === 'object' && firstRow !== null).toBe(true);
    if (typeof firstRow !== 'object' || firstRow === null) return;

    const keys = Object.keys(firstRow);
    expect(keys).toEqual([
      'name',
      'data',
      'context',
      'globals',
      'custom',
      'user',
      'nested',
      'consent',
      'id',
      'trigger',
      'entity',
      'action',
      'timestamp',
      'timing',
      'source',
    ]);
    expect(keys).toHaveLength(15);
    expect('createdAt' in firstRow).toBe(false);
  });

  test('push uses provided data verbatim when rule resolves to data', async () => {
    const logger = createMockLogger();
    const { writer, writeClient } = await openWriter(
      { projectId, datasetId, tableId },
      logger,
    );
    __resetMockCalls();

    const settings: Settings = {
      client: new BigQuery({ projectId }),
      projectId,
      datasetId,
      tableId,
      location: 'EU',
      writer,
      writeClient,
    };
    const config: Config = { settings };

    const data = { foo: 'bar' };

    await destination.push(
      event,
      createMockContext({
        config,
        rule: {},
        data,
        env: testEnv,
        id: 'test-bq',
      }),
    );

    const append = __getMockCalls().find((c) => c.method === 'appendRows');
    expect(append).toBeDefined();
    if (!append) return;
    expect(append.args[0]).toEqual([{ foo: 'bar' }]);
  });

  test('destroy closes writer and writeClient', async () => {
    const result = await callInit({ projectId, datasetId, tableId });
    expect(result).toBeTruthy();
    if (!result) return;
    __resetMockCalls();

    expect(destination.destroy).toBeDefined();
    if (!destination.destroy) return;

    await destination.destroy({
      id: 'test-bq',
      config: result,
      env: testEnv,
      logger: createMockLogger(),
    });

    const methods = __getMockCalls().map((c) => c.method);
    expect(methods).toContain('JSONWriter.close');
    expect(methods).toContain('WriterClient.close');
  });

  describe('pushBatch', () => {
    async function buildConfig(): Promise<Config> {
      const setupLogger = createMockLogger();
      const { writer, writeClient } = await openWriter(
        { projectId, datasetId, tableId },
        setupLogger,
      );
      const settings: Settings = {
        client: new BigQuery({ projectId }),
        projectId,
        datasetId,
        tableId,
        location: 'EU',
        writer,
        writeClient,
      };
      return { settings };
    }

    test('appends multiple rows in a single call', async () => {
      if (!destination.pushBatch) throw new Error('pushBatch missing');

      const config = await buildConfig();
      __resetMockCalls();

      const events = [createEvent(), createEvent(), createEvent()];
      const data: Array<undefined> = events.map(() => undefined);

      destination.pushBatch(
        { key: 'k', events, data },
        createMockContext({
          config,
          env: testEnv,
          logger: createMockLogger(),
          id: 'test-bq',
        }),
      );

      // pushBatch is synchronous and uses an IIFE for the async appendRows.
      // Wait a tick to let the IIFE complete.
      await new Promise((r) => setImmediate(r));

      const calls = __getMockCalls();
      const append = calls.find((c) => c.method === 'appendRows');
      expect(append).toBeDefined();
      if (!append) return;
      const rowsArg = append.args[0];
      expect(Array.isArray(rowsArg)).toBe(true);
      if (!Array.isArray(rowsArg)) return;
      expect(rowsArg).toHaveLength(3);
    });

    test('logs partial failures without throwing', async () => {
      if (!destination.pushBatch) throw new Error('pushBatch missing');

      const config = await buildConfig();
      __resetMockCalls();

      // Queue partial failure: row 0 fails, rows 1 and 2 succeed.
      __setNextAppendRowErrors([{ index: 0, code: 3, message: 'invalid row' }]);

      const logger = createMockLogger();
      const events = [createEvent(), createEvent(), createEvent()];
      const data: Array<undefined> = events.map(() => undefined);

      // Synchronous call must not throw.
      expect(() =>
        destination.pushBatch!(
          { key: 'k', events, data },
          createMockContext({
            config,
            env: testEnv,
            logger,
            id: 'test-bq',
          }),
        ),
      ).not.toThrow();

      // Wait for the IIFE async work to complete.
      await new Promise((r) => setImmediate(r));

      // INFO summary with ok/failed counts.
      expect(logger.info).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ ok: 2, failed: 1 }),
      );

      // ERROR per row error.
      expect(logger.error).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          index: 0,
          code: 3,
          message: 'invalid row',
        }),
      );
      expect(logger.error).toHaveBeenCalledTimes(1);
    });
  });
});
