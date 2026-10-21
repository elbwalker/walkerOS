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

import path from 'path';
import { conformance, runExamples } from '@walkeros/collector/dev';
import { storeS3Init } from '..';
import { examples, schemas } from '../dev';

const settings = {
  bucket: 'my-assets',
  endpoint: 'https://s3.eu-west-1.amazonaws.com',
  accessKeyId: 'AKID',
  secretAccessKey: 'secret',
};
const env = { push: examples.env.push, simulation: examples.env.simulation };

describe('s3 store conformance', () => {
  beforeEach(() => {
    jest.useRealTimers();
  });

  it('conforms', async () => {
    await conformance('store', storeS3Init, {
      profile: 'socket',
      examples: examples.step,
      schema: schemas.settings,
      settings,
      env,
      root: path.join(__dirname, '..', '..'),
    });
  });

  it('reports a failed read instead of a miss', async () => {
    const { failedRead } = examples.step;
    await runExamples('store', storeS3Init, { failedRead }, { settings, env });
  });
});
