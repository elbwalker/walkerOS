import { createMockLogger } from '@walkeros/core';
import {
  __getMockCalls,
  __resetMockCalls,
  __getLastConnection,
  MockStreamConnection,
} from '@google-cloud/bigquery-storage';
import { openWriter, closeWriter } from '../writer';

jest.mock('@google-cloud/bigquery-storage');

describe('openWriter', () => {
  beforeEach(() => {
    __resetMockCalls();
  });

  test('walks the 4-step JSONWriter construction sequence', async () => {
    const logger = createMockLogger();
    const result = await openWriter(
      {
        projectId: 'p',
        datasetId: 'd',
        tableId: 't',
      },
      logger,
    );
    expect(result.writer).toBeDefined();
    expect(result.writeClient).toBeDefined();

    const methods = __getMockCalls().map((c) => c.method);
    expect(methods).toEqual([
      'WriterClient.ctor',
      'createStreamConnection',
      'getWriteStream',
      'adapt.convertStorageSchemaToProto2Descriptor',
      'JSONWriter.ctor',
    ]);
  });

  test('forwards settings.bigquery auth options to the WriterClient', async () => {
    const logger = createMockLogger();
    await openWriter(
      {
        projectId: 'p',
        datasetId: 'd',
        tableId: 't',
        bigquery: { keyFilename: './sa.json' },
      },
      logger,
    );
    const ctorCall = __getMockCalls().find(
      (c) => c.method === 'WriterClient.ctor',
    );
    expect(ctorCall?.args[0]).toEqual({
      projectId: 'p',
      keyFilename: './sa.json',
    });
  });

  test('forwards timeout as the gax deadline to createStreamConnection and getWriteStream', async () => {
    const logger = createMockLogger();
    await openWriter(
      { projectId: 'p', datasetId: 'd', tableId: 't', timeout: 7500 },
      logger,
    );
    const streamCall = __getMockCalls().find(
      (c) => c.method === 'createStreamConnection',
    );
    expect(streamCall?.args[1]).toEqual({ timeout: 7500 });
    const schemaCall = __getMockCalls().find(
      (c) => c.method === 'getWriteStream',
    );
    expect(schemaCall?.args[1]).toEqual({ timeout: 7500 });
  });

  test('omits the deadline when timeout is unset', async () => {
    const logger = createMockLogger();
    await openWriter({ projectId: 'p', datasetId: 'd', tableId: 't' }, logger);
    const streamCall = __getMockCalls().find(
      (c) => c.method === 'createStreamConnection',
    );
    expect(streamCall?.args[1]).toBeUndefined();
  });

  test('closeWriter calls close on writer and writeClient', async () => {
    const logger = createMockLogger();
    const { writer, writeClient } = await openWriter(
      { projectId: 'p', datasetId: 'd', tableId: 't' },
      logger,
    );
    closeWriter({ writer, writeClient }, logger);

    const methods = __getMockCalls().map((c) => c.method);
    expect(methods).toContain('JSONWriter.close');
    expect(methods).toContain('WriterClient.close');
  });

  describe("connection 'error' listener (out-of-band containment)", () => {
    // Honesty guard: the mock StreamConnection is a REAL EventEmitter, so an
    // `emit('error', …)` with NO listener throws exactly like Node does. This
    // is the crash class this listener exists to prevent.
    test('a listener-less connection error throws (reproduces the crash)', () => {
      const conn = new MockStreamConnection('s');
      const boom: Error & { code?: number } = Object.assign(
        new Error('stream died'),
        { code: 13 },
      );
      // No listener attached -> Node re-throws the emitted error synchronously.
      expect(() => conn.__emitConnectionError(boom)).toThrow('stream died');
    });

    test('openWriter attaches a listener so the same error is contained', async () => {
      const logger = createMockLogger();
      const captured: unknown[] = [];
      await openWriter(
        {
          projectId: 'p',
          datasetId: 'd',
          tableId: 't',
          onConnectionError: (err) => {
            captured.push(err);
          },
        },
        logger,
      );

      // The destination registered via the SDK's documented hook.
      const methods = __getMockCalls().map((c) => c.method);
      expect(methods).toContain('onConnectionError');

      const conn = __getLastConnection();
      expect(conn.listenerCount('error')).toBe(1);

      const boom: Error & { code?: number } = Object.assign(
        new Error('stream died'),
        { code: 13 },
      );
      // With the listener in place the emit no longer throws: it is contained
      // and routed to the supplied handler.
      expect(() => conn.__emitConnectionError(boom)).not.toThrow();
      expect(captured).toEqual([boom]);
    });

    test('closeWriter removes the connection-error listener', async () => {
      const logger = createMockLogger();
      const handles = await openWriter(
        {
          projectId: 'p',
          datasetId: 'd',
          tableId: 't',
          onConnectionError: () => undefined,
        },
        logger,
      );
      const conn = __getLastConnection();
      expect(conn.listenerCount('error')).toBe(1);

      closeWriter(handles, logger);
      expect(conn.listenerCount('error')).toBe(0);
    });
  });
});
