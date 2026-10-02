import { mkdtempSync, rmSync, writeFileSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import type { Flow } from '@walkeros/core';
import {
  applyStoreMockEnvs,
  simulateCollector,
  simulateDestination,
  simulateSource,
  simulateTransformer,
} from '../index';

const SHEETS = '@walkeros/server-store-sheets';
const FS = '@walkeros/server-store-fs';

/**
 * Every simulate entry point injects each flow store's dev-examples mock env
 * before `startFlow` (source: before `createTrigger`, which starts the flow).
 * The prebuilt stub bundle records the config it is started with, then
 * stops, so the test reads exactly what the flow would have started with.
 */
describe('simulate injects store mock envs', () => {
  let dir: string;
  let bundlePath: string;

  const flowJson: Flow.Json = {
    version: 4,
    flows: {
      default: {
        config: { platform: 'server' },
        sources: { in: { package: '@walkeros/server-source-express' } },
        transformers: { loadUser: { package: '@walkeros/transformer-demo' } },
        destinations: { out: { package: '@walkeros/destination-demo' } },
        stores: {
          customers: { package: SHEETS, config: { settings: { id: 'x' } } },
          local: { package: FS, config: { settings: { basePath: '.' } } },
        },
      },
    },
  };

  beforeAll(() => {
    dir = mkdtempSync(join(tmpdir(), 'walkeros-simulate-stores-'));
    bundlePath = join(dir, 'bundle.mjs');
    writeFileSync(
      bundlePath,
      `
function record(config) {
  globalThis.__simulateStoresConfig = config;
  throw new Error('stub stop');
}
export function wireConfig() {
  const stores = {
    customers: {
      code: 'sheets',
      config: { settings: { id: 'x' } },
      env: { fetch: 'configured-fetch' },
    },
    local: { code: 'fs', config: { settings: { basePath: '.' } } },
  };
  return {
    sources: { in: { config: {} } },
    transformers: { loadUser: { env: { customers: stores.customers } } },
    destinations: { out: { config: {} } },
    stores,
  };
}
export async function startFlow(config) {
  return record(config);
}
export const __devExports = {
  '${SHEETS}': async () => ({
    examples: { env: { push: { fetch: 'sheets-mock-fetch' } } },
  }),
  '${FS}': async () => ({ examples: {} }),
  '@walkeros/server-source-express': async () => ({
    examples: { createTrigger: async (config) => record(config) },
  }),
  '@walkeros/destination-demo': async () => ({
    examples: { env: { push: { log: 'demo-log' } } },
  }),
};
`,
      'utf-8',
    );
  });

  beforeEach(() => {
    Reflect.set(globalThis, '__simulateStoresConfig', undefined);
  });

  afterAll(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  const event = { name: 'page view' };
  const base = () => ({ bundlePath, silent: true });

  it.each([
    [
      'source',
      () =>
        simulateSource(
          flowJson,
          { content: {} },
          { ...base(), sourceId: 'in' },
        ),
    ],
    [
      'transformer',
      () =>
        simulateTransformer(flowJson, event, {
          ...base(),
          transformerId: 'loadUser',
        }),
    ],
    [
      'collector',
      () =>
        simulateCollector(flowJson, event, {
          ...base(),
          collectorName: 'collector',
        }),
    ],
    [
      'destination',
      () =>
        simulateDestination(flowJson, event, {
          ...base(),
          destinationId: 'out',
        }),
    ],
  ])('%s simulation starts the flow with mocked stores', async (_step, run) => {
    const result = await run();

    // The stub stops right after recording: the flow reached start.
    expect(result.error?.message).toBe('stub stop');
    const started = Reflect.get(globalThis, '__simulateStoresConfig');
    // The mock replaces the store's own env, which the store reads first.
    expect(started.stores.customers.env).toEqual({
      fetch: 'sheets-mock-fetch',
    });
    expect(started.stores.customers.config).toEqual({
      settings: { id: 'x' },
    });
    // No mock env shipped: the store runs as configured.
    expect(started.stores.local.config).toEqual({
      settings: { basePath: '.' },
    });
    expect(started.stores.local.env).toBeUndefined();
    // `$store.` references resolve by identity: the def is mutated in place.
    expect(started.transformers.loadUser.env.customers).toBe(
      started.stores.customers,
    );
  });
});

describe('applyStoreMockEnvs', () => {
  const flowSettings: Flow = {
    config: { platform: 'server' },
    stores: {
      customers: { package: SHEETS, config: {} },
      local: { package: FS, config: {} },
      inline: { code: { push: '$code:() => ({})' }, config: {} },
    },
  };

  it('mocks stores with a mock env and returns the rest', async () => {
    const flowConfig = {
      stores: { customers: {}, local: { config: {} }, inline: {} },
    };
    const unmocked = await applyStoreMockEnvs(flowConfig, flowSettings, {
      [SHEETS]: async () => ({ examples: { env: { push: { fetch: 'm' } } } }),
      [FS]: async () => ({ examples: {} }),
    });

    expect(unmocked).toEqual(['local', 'inline']);
    expect(flowConfig.stores.customers).toEqual({
      env: { fetch: 'm' },
    });
    expect(flowConfig.stores.local).toEqual({ config: {} });
  });

  it('selects the mock env of the store export', async () => {
    const flowConfig = { stores: { customers: { config: {} } } };
    const settings: Flow = {
      config: { platform: 'server' },
      stores: {
        customers: { package: SHEETS, import: 'storeB', config: {} },
      },
    };
    const unmocked = await applyStoreMockEnvs(flowConfig, settings, {
      [SHEETS]: async () => ({
        examples: { env: { push: { from: 'A' } } },
        exportExamples: {
          storeA: { env: { push: { from: 'A' } } },
          storeB: { env: { push: { from: 'B' } } },
        },
      }),
    });

    expect(unmocked).toEqual([]);
    expect(flowConfig.stores.customers).toEqual({
      config: {},
      env: { from: 'B' },
    });
  });
});
