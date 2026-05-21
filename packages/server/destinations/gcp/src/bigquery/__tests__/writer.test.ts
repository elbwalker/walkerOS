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
