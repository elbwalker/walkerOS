import { generateKeyPairSync } from 'node:crypto';
import { createMockContext, createMockLogger } from '@walkeros/core';
import { expectSimulationResolves } from '@walkeros/core/dev';
import type { ServiceAccount } from '@walkeros/core';
import { storeGcsInit } from '../store';
import { examples } from '../dev';

const { privateKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
const serviceAccount: ServiceAccount = {
  client_email: 'gcs@example.iam.gserviceaccount.com',
  private_key: privateKey.export({ type: 'pkcs8', format: 'pem' }).toString(),
};

function createCtx(credentials?: ServiceAccount, file?: boolean) {
  return {
    collector: createMockContext().collector,
    logger: createMockLogger(),
    id: 'assets',
    env: examples.env.push,
    config: { settings: { bucket: 'mock-bucket' }, credentials, file },
  };
}

describe('GCS store mock env', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it.each([
    ['service account (token exchange)', serviceAccount],
    ['ADC (metadata token)', undefined],
  ])(
    'makes no network call outside env with %s',
    async (_name, credentials) => {
      const globalFetch = jest.spyOn(globalThis, 'fetch');
      const store = await storeGcsInit(createCtx(credentials));

      expect(await store.get('u1')).toBeUndefined();
      await store.set('u1', { ltv: 420 });
      expect(await store.get('u1')).toEqual({ ltv: 420 });
      await store.delete('u1');
      expect(await store.get('u1')).toBeUndefined();
      expect(globalFetch).not.toHaveBeenCalled();
    },
  );

  it('round-trips raw bytes in file mode', async () => {
    const store = await storeGcsInit(createCtx(undefined, true));
    await store.set('walker.js', 'console.log(1)');
    const bytes = await store.get('walker.js');
    expect(
      bytes instanceof Uint8Array ? Buffer.from(bytes).toString() : bytes,
    ).toBe('console.log(1)');
  });

  it('declares simulation paths that resolve', () =>
    expectSimulationResolves(examples.env));
});
