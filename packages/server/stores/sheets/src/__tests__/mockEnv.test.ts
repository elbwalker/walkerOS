import { generateKeyPairSync } from 'node:crypto';
import { createMockContext, createMockLogger } from '@walkeros/core';
import { expectSimulationResolves } from '@walkeros/core/dev';
import type { ServiceAccount } from '@walkeros/core';
import { storeSheetsInit, __resetSpreadsheetExistenceCache } from '../store';
import { examples } from '../dev';

const { privateKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
const serviceAccount: ServiceAccount = {
  client_email: 'sheets@example.iam.gserviceaccount.com',
  private_key: privateKey.export({ type: 'pkcs8', format: 'pem' }).toString(),
};

function createCtx(credentials?: ServiceAccount) {
  return {
    collector: createMockContext().collector,
    logger: createMockLogger(),
    id: 'customers',
    env: examples.env.push,
    config: { settings: { id: 'spreadsheet-id-123' }, credentials },
  };
}

describe('Sheets store mock env', () => {
  beforeEach(() => {
    __resetSpreadsheetExistenceCache();
  });

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
      const store = await storeSheetsInit(createCtx(credentials));

      expect(await store.get('alice')).toEqual({ tier: 'gold' });
      await store.set('u1', { ltv: 420 });
      expect(await store.get('u1')).toEqual({ ltv: 420 });
      await store.set('u1', { ltv: 500 });
      expect(await store.get('u1')).toEqual({ ltv: 500 });
      expect(globalFetch).not.toHaveBeenCalled();
    },
  );

  it('reads the env from the store config too', async () => {
    const globalFetch = jest.spyOn(globalThis, 'fetch');
    const ctx = createCtx();
    const store = await storeSheetsInit({
      ...ctx,
      env: {},
      config: { ...ctx.config, env: examples.env.push },
    });
    expect(await store.get('alice')).toEqual({ tier: 'gold' });
    expect(globalFetch).not.toHaveBeenCalled();
  });

  it('declares simulation paths that resolve', () =>
    expectSimulationResolves(examples.env));
});
