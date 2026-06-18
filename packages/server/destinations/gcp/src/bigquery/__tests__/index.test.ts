import type { Collector, WalkerOS } from '@walkeros/core';
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
  __setNextAppendThrow,
  __setNextGetResultReject,
  __setNextOpenWriterError,
  __getLastConnection,
  __getAllConnections,
} from '@google-cloud/bigquery-storage';
import {
  clone,
  createEvent,
  createMockContext,
  createMockLogger,
} from '@walkeros/core';
import type { MockLogger } from '@walkeros/core';
import * as examples from '../examples';
import { eventToRow } from '../eventToRow';
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

  async function callInit(
    initSettings: InitSettings,
    logger?: MockLogger,
    timeout?: number,
    reportError?: (err: unknown, event?: WalkerOS.Event) => void,
  ) {
    if (!destination.init) throw new Error('destination.init undefined');
    return destination.init({
      config:
        timeout === undefined
          ? { settings: initSettings }
          : { settings: initSettings, timeout },
      collector: mockCollector,
      env: testEnv,
      logger: logger ?? createMockLogger(),
      id: 'test-bq',
      reportError: reportError ?? (() => undefined),
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
      // The connection-error listener is attached between opening the stream and
      // building the JSONWriter so a detached `'error'` is contained, not thrown.
      'onConnectionError',
      'getWriteStream',
      'adapt.convertStorageSchemaToProto2Descriptor',
      'JSONWriter.ctor',
    ]);
  });

  test('init forwards settings.bigquery auth to the Storage Write client', async () => {
    await callInit({
      projectId,
      datasetId,
      tableId,
      bigquery: { keyFilename: './init-sa.json' },
    });
    const ctorCall = __getMockCalls().find(
      (c) => c.method === 'WriterClient.ctor',
    );
    expect(ctorCall?.args[0]).toEqual({
      projectId,
      keyFilename: './init-sa.json',
    });
  });

  test('init forwards config.credentials to BOTH the query and the Storage Write client', async () => {
    if (!destination.init) throw new Error('destination.init undefined');
    const credentials = {
      client_email: 'sa@example.com',
      private_key: '-----BEGIN PRIVATE KEY-----',
    };
    const config = await destination.init({
      config: { settings: { projectId, datasetId, tableId }, credentials },
      collector: mockCollector,
      env: testEnv,
      logger: createMockLogger(),
      id: 'test-bq',
      reportError: () => undefined,
    });
    if (!config || !config.settings) throw new Error('init returned no config');

    // Query client (BigQuery) carries the credentials on its constructor options.
    // The example mock records its ctor options on `this.options`.
    const queryClient: unknown = config.settings.client;
    if (
      typeof queryClient !== 'object' ||
      queryClient === null ||
      !('options' in queryClient)
    )
      throw new Error('mock query client did not capture options');
    const { options } = queryClient;
    if (typeof options !== 'object' || options === null)
      throw new Error('mock query client options not an object');
    const queryCredentials =
      'credentials' in options ? options.credentials : undefined;
    expect(queryCredentials).toEqual(credentials);

    // Storage Write client (WriterClient) carries the same credentials, so it
    // does not silently fall back to ADC on a non-GCP runtime.
    const ctorCall = __getMockCalls().find(
      (c) => c.method === 'WriterClient.ctor',
    );
    expect(ctorCall?.args[0]).toEqual({ projectId, credentials });
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

  test('init logs error and rethrows on non-NotFound openWriter failure', async () => {
    // Simulate the INVALID_ARGUMENT case (e.g., TYPE_UNSPECIFIED). Code 3 is
    // gRPC INVALID_ARGUMENT, which is NOT in the isNotFound (5/404) set.
    const underlyingError: Error & { code?: number } = Object.assign(
      new Error('TYPE_UNSPECIFIED: bad write stream type'),
      { code: 3 },
    );
    __setNextOpenWriterError(underlyingError);

    const logger = createMockLogger();

    await expect(
      callInit({ projectId, datasetId, tableId }, logger),
    ).rejects.toThrow('TYPE_UNSPECIFIED: bad write stream type');

    expect(logger.error).toHaveBeenCalledWith(
      expect.stringContaining('BigQuery init failed'),
      expect.objectContaining({
        error: 'TYPE_UNSPECIFIED: bad write stream type',
      }),
    );
    const errorCall = logger.error.mock.calls.find(
      (call: unknown[]) =>
        typeof call[0] === 'string' && call[0].includes('BigQuery init failed'),
    );
    expect(errorCall).toBeDefined();
    if (!errorCall) return;
    const errorContext = errorCall[1];
    expect(
      typeof errorContext === 'object' &&
        errorContext !== null &&
        'error' in errorContext,
    ).toBe(true);
    if (
      typeof errorContext !== 'object' ||
      errorContext === null ||
      !('error' in errorContext)
    )
      return;
    expect(errorContext.error).toBe('TYPE_UNSPECIFIED: bad write stream type');
  });

  test('init logs and throws an informative, DLQ-routable error on a non-NotFound failure', async () => {
    // The destination no longer scrubs error messages itself: secret redaction
    // is standardized at the CLI logger handler (covers stderr + heartbeat ring)
    // and the thrown error is scrubbed on output there. Here the destination's
    // job is to log the failure and rethrow the RAW error so it stays
    // informative and DLQ-routable, keeping its routing `code`.
    const underlyingError: Error & { code?: number } = Object.assign(
      new Error('streams/_default" contains illegal characters'),
      { code: 3 }, // INVALID_ARGUMENT — not NotFound, so it hits the catch-all
    );
    __setNextOpenWriterError(underlyingError);

    const logger = createMockLogger();

    let thrown: unknown;
    try {
      await callInit({ projectId, datasetId, tableId }, logger);
    } catch (err) {
      thrown = err;
    }

    // The thrown error is the raw error: informative and DLQ-routable, with its
    // routing code intact (read without a cast).
    expect(thrown).toBe(underlyingError);
    expect(thrown).toBeInstanceOf(Error);
    if (!(thrown instanceof Error)) return;
    expect(thrown.message).toContain('contains illegal characters');
    expect('code' in thrown).toBe(true);
    if (!('code' in thrown)) return;
    const withCode: { code?: unknown } = thrown;
    expect(withCode.code).toBe(3);

    // Still informative for the operator.
    const serialized = JSON.stringify(logger.error.mock.calls);
    expect(serialized).toContain('BigQuery init failed');
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
      const entries = events.map((event) => ({ event }));

      await destination.pushBatch(
        { key: 'k', events, data, entries },
        createMockContext({
          config,
          env: testEnv,
          logger: createMockLogger(),
          id: 'test-bq',
        }),
      );

      const calls = __getMockCalls();
      const append = calls.find((c) => c.method === 'appendRows');
      expect(append).toBeDefined();
      if (!append) return;
      const rowsArg = append.args[0];
      expect(Array.isArray(rowsArg)).toBe(true);
      if (!Array.isArray(rowsArg)) return;
      expect(rowsArg).toHaveLength(3);
    });

    test('uses entry data when present and eventToRow otherwise per entry', async () => {
      if (!destination.pushBatch) throw new Error('pushBatch missing');

      const config = await buildConfig();
      __resetMockCalls();

      const e0 = createEvent();
      const e1 = createEvent();
      const mappedRow = { custom: 'mapped-row' };
      const events = [e0, e1];
      // Entry 1 carries mapped data, entry 0 does not. The derived `data` array
      // is compacted (only defined entries), so `data[0]` is the mapped row and
      // `data[1]` is undefined -- misaligned with `events`. Reading `entries`
      // keeps each event's data correct.
      const data = [mappedRow];
      const entries = [{ event: e0 }, { event: e1, data: mappedRow }];

      await destination.pushBatch(
        { key: 'k', events, data, entries },
        createMockContext({
          config,
          env: testEnv,
          logger: createMockLogger(),
          id: 'test-bq',
        }),
      );

      const calls = __getMockCalls();
      const append = calls.find((c) => c.method === 'appendRows');
      expect(append).toBeDefined();
      if (!append) return;
      const rowsArg = append.args[0];
      expect(Array.isArray(rowsArg)).toBe(true);
      if (!Array.isArray(rowsArg)) return;
      expect(rowsArg).toHaveLength(2);
      expect(rowsArg[0]).toEqual(eventToRow(e0));
      expect(rowsArg[1]).toEqual(mappedRow);
    });

    test('returns a per-row outcome on partial row errors instead of throwing', async () => {
      if (!destination.pushBatch) throw new Error('pushBatch missing');

      const config = await buildConfig();
      __resetMockCalls();

      // Queue partial failure: row 0 fails, rows 1 and 2 succeed.
      __setNextAppendRowErrors([{ index: 0, code: 3, message: 'invalid row' }]);

      const logger = createMockLogger();
      const events = [createEvent(), createEvent(), createEvent()];
      const data: Array<undefined> = events.map(() => undefined);
      const entries = events.map((event) => ({ event }));

      // Partial row errors no longer throw: the destination reports the failed
      // rows via a BatchOutcome so the collector DLQs only those rows and counts
      // the succeeded rows as delivered (avoids duplicates on DLQ retry).
      const outcome = await destination.pushBatch!(
        { key: 'k', events, data, entries },
        createMockContext({
          config,
          env: testEnv,
          logger,
          id: 'test-bq',
        }),
      );

      expect(outcome).toEqual({
        failed: [
          {
            index: 0,
            error: expect.objectContaining({
              code: 3,
              message: 'invalid row',
            }),
          },
        ],
      });

      // INFO summary with ok/failed counts for operator visibility.
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
    });

    test('rejects when appendRows throws', async () => {
      if (!destination.pushBatch) throw new Error('pushBatch missing');

      const config = await buildConfig();
      __resetMockCalls();

      __setNextAppendThrow(new Error('append boom'));

      const logger = createMockLogger();
      const events = [createEvent(), createEvent()];
      const data: Array<undefined> = events.map(() => undefined);
      const entries = events.map((event) => ({ event }));

      await expect(
        destination.pushBatch!(
          { key: 'k', events, data, entries },
          createMockContext({
            config,
            env: testEnv,
            logger,
            id: 'test-bq',
          }),
        ),
      ).rejects.toThrow('append boom');
    });

    test('rejects when init() has not run (writer missing)', async () => {
      if (!destination.pushBatch) throw new Error('pushBatch missing');

      // Misconfigured destination: settings present but writer absent because
      // init() never ran. The batch path must surface this like single-push.
      const settings: Settings = {
        client: new BigQuery({ projectId }),
        projectId,
        datasetId,
        tableId,
        location: 'EU',
      };
      const config: Config = { settings };

      const logger = createMockLogger();
      const events = [createEvent()];
      const entries = events.map((event) => ({ event }));

      await expect(
        destination.pushBatch!(
          { key: 'k', events, data: [undefined], entries },
          createMockContext({
            config,
            env: testEnv,
            logger,
            id: 'test-bq',
          }),
        ),
      ).rejects.toThrow('writer is missing');
    });
  });

  describe('gRPC deadline (config.timeout)', () => {
    // The Storage Write API appendRows runs on the long-lived bidi stream opened
    // by createStreamConnection. The deadline is therefore applied at the
    // stream-connection level (gax CallOptions.timeout), which governs every
    // appendRows/getResult on that stream, and at the unary getWriteStream call.
    // The deadline derives from the standard per-step config.timeout, the same
    // value the collector uses to race the push, not a destination-custom knob.

    test('init forwards the standard config.timeout as the gax deadline on the appendRows stream and schema fetch', async () => {
      await callInit({ projectId, datasetId, tableId }, undefined, 5000);

      const streamCall = __getMockCalls().find(
        (c) => c.method === 'createStreamConnection',
      );
      expect(streamCall?.args[1]).toEqual({ timeout: 5000 });

      const schemaCall = __getMockCalls().find(
        (c) => c.method === 'getWriteStream',
      );
      expect(schemaCall?.args[1]).toEqual({ timeout: 5000 });
    });

    test('init applies the default deadline when config.timeout is unset', async () => {
      await callInit({ projectId, datasetId, tableId });

      const streamCall = __getMockCalls().find(
        (c) => c.method === 'createStreamConnection',
      );
      expect(streamCall?.args[1]).toEqual({ timeout: 10000 });

      const schemaCall = __getMockCalls().find(
        (c) => c.method === 'getWriteStream',
      );
      expect(schemaCall?.args[1]).toEqual({ timeout: 10000 });
    });

    test('init treats config.timeout: 0 as "use the default" (no zero-ms deadline)', async () => {
      // A zero-ms deadline would expire immediately; 0 is not a "disabled"
      // sentinel. Resolution falls back to the default so writer.ts always gets
      // a positive deadline, mirroring the collector's resolveDestinationTimeout.
      await callInit({ projectId, datasetId, tableId }, undefined, 0);

      const streamCall = __getMockCalls().find(
        (c) => c.method === 'createStreamConnection',
      );
      expect(streamCall?.args[1]).toEqual({ timeout: 10000 });

      const schemaCall = __getMockCalls().find(
        (c) => c.method === 'getWriteStream',
      );
      expect(schemaCall?.args[1]).toEqual({ timeout: 10000 });
    });

    test('a deadline-exceeded getResult surfaces as a rejection from push (so the collector can DLQ it)', async () => {
      const logger = createMockLogger();
      const { writer, writeClient } = await openWriter(
        { projectId, datasetId, tableId, timeout: 1000 },
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

      const deadlineError: Error & { code?: number } = Object.assign(
        new Error('Deadline exceeded'),
        { code: 4 }, // gRPC DEADLINE_EXCEEDED
      );
      __setNextGetResultReject(deadlineError);

      await expect(
        destination.push(
          event,
          createMockContext({
            config,
            rule: undefined,
            data: undefined,
            env: testEnv,
            id: 'test-bq',
          }),
        ),
      ).rejects.toThrow('Deadline exceeded');
    });

    test('a getResult rejection surfaces the raw, informative, DLQ-routable error from push', async () => {
      // Single-event path (batching off): a getResult() rejection must surface
      // to the collector/DLQ as the RAW error, keeping its message and routing
      // `code`. Secret redaction is standardized at the CLI logger handler, so
      // the destination no longer scrubs here.
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

      const appendError: Error & { code?: number } = Object.assign(
        new Error('streams/_default" contains illegal characters'),
        { code: 3 },
      );
      __setNextGetResultReject(appendError);

      let thrown: unknown;
      try {
        await destination.push(
          event,
          createMockContext({
            config,
            rule: undefined,
            data: undefined,
            env: testEnv,
            logger,
            id: 'test-bq',
          }),
        );
      } catch (err) {
        thrown = err;
      }

      // The raw error surfaces: an Error, informative, with the routing code
      // intact (read without a cast).
      expect(thrown).toBe(appendError);
      expect(thrown).toBeInstanceOf(Error);
      if (!(thrown instanceof Error)) return;
      expect(thrown.message).toContain('contains illegal characters');
      expect('code' in thrown).toBe(true);
      if (!('code' in thrown)) return;
      const withCode: { code?: unknown } = thrown;
      expect(withCode.code).toBe(3);

      // The destination still logs the failure for the operator.
      const serialized = JSON.stringify(logger.error.mock.calls);
      expect(serialized).toContain('BigQuery row append threw');
    });

    test('a deadline-exceeded getResult rejects pushBatch (whole batch DLQ)', async () => {
      if (!destination.pushBatch) throw new Error('pushBatch missing');

      const logger = createMockLogger();
      const { writer, writeClient } = await openWriter(
        { projectId, datasetId, tableId, timeout: 1000 },
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

      const deadlineError: Error & { code?: number } = Object.assign(
        new Error('Deadline exceeded'),
        { code: 4 },
      );
      __setNextGetResultReject(deadlineError);

      const events = [createEvent(), createEvent()];
      const data: Array<undefined> = events.map(() => undefined);
      const entries = events.map((e) => ({ event: e }));

      await expect(
        destination.pushBatch!(
          { key: 'k', events, data, entries },
          createMockContext({
            config,
            env: testEnv,
            logger,
            id: 'test-bq',
          }),
        ),
      ).rejects.toThrow('Deadline exceeded');
    });
  });

  describe("connection 'error' containment + self-heal", () => {
    test('a non-retryable stream error sets writerBroken, calls reportError (orphan), and DLQ-routes the next push', async () => {
      const reportError = jest.fn();
      const config = await callInit(
        { projectId, datasetId, tableId },
        undefined,
        undefined,
        reportError,
      );
      if (!config) throw new Error('init returned void');
      const { settings } = config;
      if (!settings) throw new Error('settings missing after init');

      // Emit an out-of-band, non-retryable stream error on the live connection.
      // With the listener attached this does NOT throw (containment).
      const streamError: Error & { code?: number } = Object.assign(
        new Error('INVALID_ARGUMENT: stream is permanently broken'),
        { code: 3 },
      );
      expect(() =>
        __getLastConnection().__emitConnectionError(streamError),
      ).not.toThrow();

      // Orphan reportError form: called with the error and NO event.
      expect(reportError).toHaveBeenCalledTimes(1);
      expect(reportError).toHaveBeenCalledWith(streamError);
      expect(reportError.mock.calls[0]).toHaveLength(1);

      // The destination flagged itself broken with the last error captured.
      expect(settings.writerBroken).toBe(true);
      expect(settings.lastStreamError).toBe(streamError);

      // The next push self-heals (one re-open). Make that re-open FAIL so the
      // event is DLQ-routed in-band (throws) rather than crashing out-of-band.
      __setNextOpenWriterError(
        Object.assign(new Error('re-open failed'), { code: 14 }),
      );

      await expect(
        destination.push(
          event,
          createMockContext({
            config,
            rule: undefined,
            data: undefined,
            env: testEnv,
            id: 'test-bq',
          }),
        ),
      ).rejects.toThrow('re-open failed');

      // Stayed broken after a failed re-open.
      expect(settings.writerBroken).toBe(true);
    });

    test('the next push self-heals (re-opens) and delivers when writerBroken', async () => {
      const config = await callInit({ projectId, datasetId, tableId });
      if (!config) throw new Error('init returned void');
      const { settings } = config;
      if (!settings) throw new Error('settings missing after init');

      // Break the writer via the connection error path.
      __getLastConnection().__emitConnectionError(new Error('stream gone'));
      expect(settings.writerBroken).toBe(true);
      const brokenWriter = settings.writer;

      __resetMockCalls();

      // Next push: re-open succeeds (no queued openWriter error), flag clears,
      // and the row is appended on the fresh writer.
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

      expect(settings.writerBroken).toBe(false);
      expect(settings.lastStreamError).toBeUndefined();
      expect(settings.writer).not.toBe(brokenWriter);

      const methods = __getMockCalls().map((c) => c.method);
      // A fresh writer was opened (re-open) and a row appended.
      expect(methods).toContain('JSONWriter.ctor');
      expect(methods).toContain('appendRows');
    });

    test('the re-opened WriterClient still carries config.credentials', async () => {
      if (!destination.init) throw new Error('destination.init undefined');
      const credentials = {
        client_email: 'sa@example.com',
        private_key: '-----BEGIN PRIVATE KEY-----',
      };
      const config = await destination.init({
        config: { settings: { projectId, datasetId, tableId }, credentials },
        collector: mockCollector,
        env: testEnv,
        logger: createMockLogger(),
        id: 'test-bq',
        reportError: () => undefined,
      });
      if (!config || !config.settings)
        throw new Error('init returned no config');
      const { settings } = config;

      __getLastConnection().__emitConnectionError(new Error('stream gone'));
      expect(settings.writerBroken).toBe(true);

      __resetMockCalls();

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

      expect(settings.writerBroken).toBe(false);
      // The re-open constructs a fresh WriterClient; it must still receive the
      // resolved credentials so the self-healed writer authenticates as the
      // same identity instead of falling back to ADC.
      const reopenCtor = __getMockCalls().find(
        (c) => c.method === 'WriterClient.ctor',
      );
      expect(reopenCtor?.args[0]).toEqual({ projectId, credentials });
    });

    test('a broken writer DLQ-routes the whole batch when re-open fails (batch path)', async () => {
      if (!destination.pushBatch) throw new Error('pushBatch missing');

      const config = await callInit({ projectId, datasetId, tableId });
      if (!config) throw new Error('init returned void');
      const { settings } = config;
      if (!settings) throw new Error('settings missing after init');

      __getLastConnection().__emitConnectionError(new Error('stream gone'));
      expect(settings.writerBroken).toBe(true);

      // Re-open fails on the batch path -> whole batch throws (DLQ).
      __setNextOpenWriterError(new Error('re-open failed (batch)'));

      const logger = createMockLogger();
      const events = [createEvent(), createEvent()];
      const data: Array<undefined> = events.map(() => undefined);
      const entries = events.map((e) => ({ event: e }));

      await expect(
        destination.pushBatch!(
          { key: 'k', events, data, entries },
          createMockContext({
            config,
            env: testEnv,
            logger,
            id: 'test-bq',
          }),
        ),
      ).rejects.toThrow('re-open failed (batch)');

      expect(settings.writerBroken).toBe(true);
    });

    test('concurrent pushes on a broken writer trigger exactly ONE re-open (no orphaned connection or listener)', async () => {
      const config = await callInit({ projectId, datasetId, tableId });
      if (!config) throw new Error('init returned void');
      const { settings } = config;
      if (!settings) throw new Error('settings missing after init');

      // Break the writer. The original (now broken) connection still holds its
      // 'error' listener until the re-open closes it.
      const brokenConnection = __getLastConnection();
      brokenConnection.__emitConnectionError(new Error('stream gone'));
      expect(settings.writerBroken).toBe(true);
      expect(brokenConnection.listenerCount('error')).toBe(1);

      __resetMockCalls();

      // Two pushes admitted in the same breaking pass (breaker still CLOSED):
      // the collector would fan these out concurrently. Without the in-flight
      // memo each would close+re-open, orphaning a connection + listener.
      const ctx = () =>
        createMockContext({
          config,
          rule: undefined,
          data: undefined,
          env: testEnv,
          id: 'test-bq',
        });
      await Promise.all([
        destination.push(event, ctx()),
        destination.push(event, ctx()),
      ]);

      // Exactly ONE re-open: one new connection, one new JSONWriter.
      const methods = __getMockCalls().map((c) => c.method);
      expect(
        methods.filter((m) => m === 'createStreamConnection'),
      ).toHaveLength(1);
      expect(methods.filter((m) => m === 'JSONWriter.ctor')).toHaveLength(1);

      // The writer self-healed and both rows were appended on the one writer.
      expect(settings.writerBroken).toBe(false);
      expect(methods.filter((m) => m === 'appendRows')).toHaveLength(2);

      // No orphaned connection: exactly one connection (the live one) still
      // carries an 'error' listener; the broken one was .off()'d on re-open.
      const leaked = __getAllConnections().filter(
        (c) => c.listenerCount('error') > 0,
      );
      expect(leaked).toHaveLength(1);
      expect(leaked[0]).toBe(settings.connection);
      expect(brokenConnection.listenerCount('error')).toBe(0);
    });
  });
});
