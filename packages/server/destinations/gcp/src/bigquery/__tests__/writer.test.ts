import { createMockLogger } from '@walkeros/core';
import {
  __getMockCalls,
  __resetMockCalls,
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
});
