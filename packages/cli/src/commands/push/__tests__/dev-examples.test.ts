import { mkdtempSync, rmSync, writeFileSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import type { Flow } from '@walkeros/core';
import { legacyExportRefusal, selectDevExamples } from '../dev-examples';
import { simulateDestination } from '../index';

const bq = { env: { push: { BigQuery: 'bq' } } };
const ps = { env: { push: { PubSub: 'ps' } } };
const multi = {
  examples: bq,
  exportExamples: { destinationBigQuery: bq, destinationPubSub: ps },
};
const single = { examples: bq };

describe('selectDevExamples', () => {
  it.each([
    ['map, named export', multi, 'destinationPubSub', ps],
    ['map, default export', multi, 'destinationBigQuery', bq],
    ['map, export missing from the map', multi, 'destinationTypo', undefined],
    ['map, step uses the default export', multi, undefined, bq],
    ['no map, any export', single, 'destinationWhatever', bq],
    ['no map, no export', single, undefined, bq],
    ['not a module', undefined, 'destinationPubSub', undefined],
  ])('%s', (_label, dev, exportName, expected) => {
    expect(selectDevExamples(dev, exportName)).toBe(expected);
  });
});

/**
 * Destination simulate resolves the step's export against the package's
 * `exportExamples` map and refuses, before `startFlow`, when that export has
 * no mock `push` env. The prebuilt stub bundle counts `startFlow` calls on
 * a global and keeps the config it received.
 */
describe('simulateDestination export-keyed mock env', () => {
  const PKG = '@walkeros/server-destination-gcp';
  // A multi-export package version from before `exportExamples`, and a
  // single-export package: both ship only `examples`.
  const LEGACY = '@walkeros/legacy-multi';
  const SINGLE = '@walkeros/single';
  let dir: string;
  let bundlePath: string;

  function flowJson(importName: string, pkg: string = PKG): Flow.Json {
    return {
      version: 4,
      flows: {
        default: {
          config: { platform: 'server' },
          destinations: {
            out: { package: pkg, import: importName, config: {} },
          },
        },
      },
    };
  }

  beforeAll(() => {
    dir = mkdtempSync(join(tmpdir(), 'walkeros-dev-examples-'));
    bundlePath = join(dir, 'bundle.mjs');
    writeFileSync(
      bundlePath,
      `
const bq = { env: { push: { BigQuery: 'bq-mock' } } };
const ps = { env: { push: { PubSub: 'ps-mock' } } };
export function wireConfig() {
  return { destinations: { out: { config: {} } } };
}
export async function startFlow(config) {
  globalThis.__devExamplesStartFlowCalls =
    (globalThis.__devExamplesStartFlowCalls || 0) + 1;
  globalThis.__devExamplesConfig = config;
  return {
    collector: {
      destinations: { out: {} },
      pending: { destinations: {} },
      push: async () => ({ ok: true }),
      command: async () => undefined,
    },
  };
}
export const __devExports = {
  '${PKG}': async () => ({
    examples: bq,
    exportExamples: { destinationBigQuery: bq, destinationPubSub: ps },
  }),
  '${LEGACY}': async () => ({ examples: bq }),
  '${SINGLE}': async () => ({ examples: bq }),
};
export const __packageExports = {
  '${PKG}': ['destinationBigQuery', 'destinationPubSub'],
  '${LEGACY}': ['destinationBigQuery', 'destinationPubSub'],
  '${SINGLE}': ['destinationSingle'],
};
`,
      'utf-8',
    );
  });

  beforeEach(() => {
    Reflect.set(globalThis, '__devExamplesStartFlowCalls', 0);
    Reflect.set(globalThis, '__devExamplesConfig', undefined);
  });

  afterAll(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it('refuses an export missing from the map before startFlow', async () => {
    const result = await simulateDestination(
      flowJson('destinationTypo'),
      { name: 'page view' },
      { destinationId: 'out', bundlePath, silent: true },
    );

    expect(result.error?.message).toBe(
      `No mock env for ${PKG} export destinationTypo: simulate would call the real vendor. Add examples.env.push to the package's dev examples.`,
    );
    expect(Reflect.get(globalThis, '__devExamplesStartFlowCalls')).toBe(0);
  });

  it('refuses a named export of a multi-export package without the map', async () => {
    const result = await simulateDestination(
      flowJson('destinationPubSub', LEGACY),
      { name: 'page view' },
      { destinationId: 'out', bundlePath, silent: true },
    );

    expect(result.error?.message).toBe(
      `No mock env for ${LEGACY} export destinationPubSub: this package version predates export-keyed examples; use a version with exportExamples or a local path.`,
    );
    expect(Reflect.get(globalThis, '__devExamplesStartFlowCalls')).toBe(0);
  });

  it('uses examples for a single-export package without the map', async () => {
    const result = await simulateDestination(
      flowJson('destinationSingle', SINGLE),
      { name: 'page view' },
      { destinationId: 'out', bundlePath, silent: true },
    );

    expect(result.error).toBeUndefined();
    expect(Reflect.get(globalThis, '__devExamplesConfig')).toMatchObject({
      destinations: { out: { config: { env: { BigQuery: 'bq-mock' } } } },
    });
  });

  const declared = {
    [LEGACY]: ['destinationBigQuery', 'destinationPubSub'],
    [SINGLE]: ['destinationSingle'],
  };

  it.each([
    [
      'map present',
      { exportExamples: {} },
      declared,
      LEGACY,
      'destinationPubSub',
    ],
    ['default export', {}, declared, LEGACY, undefined],
    ['single export', {}, declared, SINGLE, 'destinationSingle'],
    [
      'package declaring no exports',
      {},
      declared,
      '@walkeros/x',
      'destinationX',
    ],
    ['old bundle, default export', {}, undefined, SINGLE, undefined],
  ])(
    'legacyExportRefusal lets %s through',
    (_label, devModule, packageExports, pkg, exportName) => {
      expect(
        legacyExportRefusal(devModule, packageExports, pkg, exportName),
      ).toBeUndefined();
    },
  );

  it('legacyExportRefusal lets a named single-export import through with an empty __packageExports', () => {
    expect(
      legacyExportRefusal({}, {}, SINGLE, 'destinationSingle'),
    ).toBeUndefined();
  });

  it('legacyExportRefusal refuses a named export in an old bundle without a map', () => {
    expect(
      legacyExportRefusal({}, undefined, SINGLE, 'destinationSingle'),
    ).toBe(
      `No mock env for ${SINGLE} export destinationSingle: this package version predates export-keyed examples; use a version with exportExamples or a local path.`,
    );
  });

  it("injects the step export's mock env, not the default's", async () => {
    const result = await simulateDestination(
      flowJson('destinationPubSub'),
      { name: 'page view' },
      { destinationId: 'out', bundlePath, silent: true },
    );

    expect(result.error).toBeUndefined();
    expect(Reflect.get(globalThis, '__devExamplesStartFlowCalls')).toBe(1);
    expect(Reflect.get(globalThis, '__devExamplesConfig')).toMatchObject({
      destinations: { out: { config: { env: { PubSub: 'ps-mock' } } } },
    });
  });
});
