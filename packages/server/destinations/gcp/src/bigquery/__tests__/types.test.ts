import type { BigQuery } from '@google-cloud/bigquery';
import type { Env, QueryClient } from '../types';
import type { StreamConnection, WriterKit } from '../writer';
import { createMockLogger } from '@walkeros/core';
import { managedwriter, adapt } from '@google-cloud/bigquery-storage';
import {
  __getMockCalls,
  __resetMockCalls,
} from '../__mocks__/@google-cloud/bigquery-storage';
import { openWriter } from '../writer';
import * as examples from '../examples';

// The real SDK here, so the example env's pieces (the package-local mock) are
// distinct from the SDK fallback and a test can tell which one openWriter used.
jest.unmock('@google-cloud/bigquery-storage');

// Type pins, compiled by the package typecheck: an SDK upgrade that breaks the
// structural contract fails the build here.
const sdkKit: WriterKit<StreamConnection> = {
  WriterClient: managedwriter.WriterClient,
  JSONWriter: managedwriter.JSONWriter,
  adapt,
};
const asQueryClient = (client: BigQuery): QueryClient => client;
const exampleEnv: Env = examples.env.push;

const args = { projectId: 'p', datasetId: 'd', tableId: 't' };

describe('BigQuery structural types', () => {
  beforeEach(() => {
    __resetMockCalls();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('the SDK kit and query client pins are the real SDK', () => {
    expect(sdkKit.WriterClient).toBe(managedwriter.WriterClient);
    expect(typeof asQueryClient).toBe('function');
  });

  test('openWriter builds the writer from the example env pieces', async () => {
    const sdkConnect = jest
      .spyOn(managedwriter.WriterClient.prototype, 'createStreamConnection')
      .mockRejectedValue(new Error('SDK WriterClient used'));
    const sdkAppend = jest.spyOn(
      managedwriter.JSONWriter.prototype,
      'appendRows',
    );

    const { writer } = await openWriter(
      { ...args, env: exampleEnv },
      createMockLogger(),
    );
    await writer.appendRows([{ name: 'page view' }]).getResult();

    expect(exampleEnv.WriterClient).not.toBe(managedwriter.WriterClient);
    const methods = __getMockCalls().map((c) => c.method);
    expect(methods.filter((m) => m === 'appendRows')).toHaveLength(1);
    expect(methods).toContain('WriterClient.ctor');
    expect(methods).toContain('JSONWriter.ctor');
    expect(sdkConnect).not.toHaveBeenCalled();
    expect(sdkAppend).not.toHaveBeenCalled();
  });

  test('an injected WriterClient without a JSONWriter fails init and closes the client', async () => {
    const env: Env = { WriterClient: exampleEnv.WriterClient };

    await expect(
      openWriter({ ...args, env }, createMockLogger()),
    ).rejects.toThrow(
      'BigQuery env: an injected WriterClient needs an injected JSONWriter; its connection cannot feed the SDK writer.',
    );

    const methods = __getMockCalls().map((c) => c.method);
    expect(methods).toContain('WriterClient.close');
    expect(methods).not.toContain('JSONWriter.ctor');
  });
});
