// s3mini ships ESM only, so jest cannot load the real client. This stand-in
// sends requests the way s3mini does (path-style URL, through the `fetch` its
// constructor receives), which is the seam the mock env plugs into.
jest.mock('s3mini', () => ({
  S3mini: jest
    .fn()
    .mockImplementation(
      (config: { endpoint: string; fetch?: typeof fetch }) => {
        const send = config.fetch ?? fetch;
        const url = (key: string) => `${config.endpoint}/${key}`;
        return {
          async bucketExists() {
            return (
              (await send(config.endpoint, { method: 'HEAD' })).status === 200
            );
          },
          async getObjectArrayBuffer(key: string) {
            const res = await send(url(key), { method: 'GET' });
            return res.status === 200 ? res.arrayBuffer() : null;
          },
          async putObject(key: string, data: string | Uint8Array) {
            return send(url(key), {
              method: 'PUT',
              body: typeof data === 'string' ? data : new Uint8Array(data),
            });
          },
          async deleteObject(key: string) {
            const res = await send(url(key), { method: 'DELETE' });
            return res.status === 204;
          },
        };
      },
    ),
}));

import { createMockContext, createMockLogger } from '@walkeros/core';
import { expectSimulationResolves } from '@walkeros/core/dev';
import { S3mini } from 's3mini';
import { storeS3Init } from '../store';
import { examples } from '../dev';

function createCtx(file?: boolean) {
  return {
    collector: createMockContext().collector,
    logger: createMockLogger(),
    id: 'assets',
    env: examples.env.push,
    config: {
      settings: {
        bucket: 'mock-bucket',
        endpoint: 'https://s3.example.com',
        accessKeyId: 'AKIDEXAMPLE',
        secretAccessKey: 'mock-secret',
        region: 'eu-central-1',
      },
      file,
    },
  };
}

describe('S3 store mock env', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('hands the env fetch to the S3 client', async () => {
    // The mock env's `fetch` getter builds a fresh backend per read: read once.
    const injected = examples.env.push.fetch;
    await storeS3Init({ ...createCtx(), env: { fetch: injected } });
    expect(S3mini).toHaveBeenLastCalledWith(
      expect.objectContaining({ fetch: injected }),
    );
  });

  it('makes no network call outside env and works against its mock env', async () => {
    const globalFetch = jest.spyOn(globalThis, 'fetch');
    const store = await storeS3Init(createCtx());

    expect(await store.get('u1')).toBeUndefined();
    await store.set('u1', { ltv: 420 });
    expect(await store.get('u1')).toEqual({ ltv: 420 });
    await store.delete('u1');
    expect(await store.get('u1')).toBeUndefined();
    expect(globalFetch).not.toHaveBeenCalled();
  });

  it('round-trips raw bytes in file mode', async () => {
    const store = await storeS3Init(createCtx(true));
    await store.set('walker.js', 'console.log(1)');
    const bytes = await store.get('walker.js');
    expect(
      bytes instanceof Uint8Array ? Buffer.from(bytes).toString() : bytes,
    ).toBe('console.log(1)');
  });

  it('declares simulation paths that resolve', () =>
    expectSimulationResolves(examples.env));
});
