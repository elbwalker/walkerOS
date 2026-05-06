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
