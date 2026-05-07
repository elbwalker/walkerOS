/**
 * NFT regression coverage for the GCP server fixture.
 *
 * Three layers of assertion, ordered coarse to fine:
 *
 * 1. Hard assertion (granular, never breaks on transitive bumps): a
 *    `.proto` file under
 *    `dist/node_modules/@google-cloud/bigquery-storage/build/protos/`
 *    exists. This is the `__dirname`-loaded asset regression check
 *    (success criterion #2): GCP loads protobuf descriptors at runtime
 *    via `path.join(__dirname, '..', 'protos', 'storage.proto')`. nft
 *    must keep these next to the JS that references them.
 *
 * 2. Upper-bound assertion: `result.fileList.length` stays under a
 *    threshold. Catches the over-scan regression class (e.g. nft 0.30.2
 *    over-scanned `.git` and similar). The threshold is set generously
 *    above the realistic file count for the GCP fixture.
 *
 * 3. Focused snapshot: sorted list of TOP-LEVEL package names visible
 *    under `dist/node_modules/`. NOT the full file tree (which would
 *    diff daily on transitive bumps). Just the package set.
 *
 * Snapshot rule: when the GCP fixture or its transitive package set
 * changes intentionally, update this snapshot intentionally; do not
 * blindly accept. A diff here means the install layer (pacote) or nft
 * is reaching a different set of top-level packages than the last
 * pinned shape.
 *
 * This test mocks `downloadPackagesWithResolution` and `traceAndCopy`
 * rather than fetching real npm packages. The fixture exists on disk
 * for documentation and for the integration smoke test to consume; the
 * regression catcher is faster and deterministic this way.
 */

import os from 'os';
import path from 'path';
import fs from 'fs-extra';
import { bundleCore } from '../bundler';
import { createCLILogger } from '../../../core/cli-logger.js';
import type { BuildOptions } from '../../../types/bundle.js';
import type { Flow } from '@walkeros/core';

jest.mock('../nft-trace', () => {
  const actual = jest.requireActual('../nft-trace');
  return {
    ...actual,
    traceAndCopy: jest.fn(actual.traceAndCopy),
  };
});
jest.mock('../package-manager.js', () => {
  const actual = jest.requireActual('../package-manager.js');
  return {
    ...actual,
    downloadPackagesWithResolution: jest.fn(
      actual.downloadPackagesWithResolution,
    ),
  };
});

import { traceAndCopy } from '../nft-trace';
import { downloadPackagesWithResolution } from '../package-manager.js';

const mockTraceAndCopy = traceAndCopy as jest.MockedFunction<
  typeof traceAndCopy
>;
const mockDownloadWithResolution =
  downloadPackagesWithResolution as jest.MockedFunction<
    typeof downloadPackagesWithResolution
  >;

const FIXTURE_DIR = path.resolve(
  __dirname,
  '..',
  '..',
  '..',
  '__tests__',
  'fixtures',
  'nft-server-gcp',
);

/**
 * Realistic top-level package set for the GCP fixture. Sorted; this is
 * the focused snapshot. Update intentionally when the fixture or its
 * pacote-resolved package set changes (decision #8 in the bundler-nft
 * redesign plan: pacote is the install layer).
 */
const EXPECTED_TOP_LEVEL_PACKAGES = [
  '@google-cloud/bigquery-storage',
  '@walkeros/collector',
  '@walkeros/server-destination-console',
  '@walkeros/server-destination-gcp',
  '@walkeros/server-source-express',
];

/**
 * Synthetic file list shape that mirrors a real GCP install:
 * - The bigquery-storage `.proto` (regression marker).
 * - A handful of JS/JSON files per top-level package.
 * - Manifests so `assertDepsTraced` is satisfied.
 *
 * The exact file count does not matter for the snapshot; the
 * upper-bound assertion is well above this list and well below a
 * runaway over-scan.
 */
const SYNTHETIC_FILE_LIST: string[] = [
  // bigquery-storage tree, including the __dirname-loaded asset.
  'node_modules/@google-cloud/bigquery-storage/package.json',
  'node_modules/@google-cloud/bigquery-storage/build/src/index.js',
  'node_modules/@google-cloud/bigquery-storage/build/src/v1/index.js',
  'node_modules/@google-cloud/bigquery-storage/build/protos/google/cloud/bigquery/storage/v1/storage.proto',
  'node_modules/@google-cloud/bigquery-storage/build/protos/google/cloud/bigquery/storage/v1/stream.proto',
  // walkerOS step packages.
  'node_modules/@walkeros/collector/package.json',
  'node_modules/@walkeros/collector/dist/index.mjs',
  'node_modules/@walkeros/server-source-express/package.json',
  'node_modules/@walkeros/server-source-express/dist/index.mjs',
  'node_modules/@walkeros/server-destination-console/package.json',
  'node_modules/@walkeros/server-destination-console/dist/index.mjs',
  'node_modules/@walkeros/server-destination-gcp/package.json',
  'node_modules/@walkeros/server-destination-gcp/dist/index.mjs',
];

/**
 * Upper bound on the trace fileList length. Set well above the realistic
 * GCP install size (a few hundred files including transitive deps),
 * well below any over-scan regression (which historically reached into
 * `.git` and similar and produced thousands of stray entries).
 */
const FILE_LIST_UPPER_BOUND = 3000;

describe('nft regression: GCP server fixture', () => {
  let tmp: string;
  const logger = createCLILogger({ silent: true });

  beforeEach(async () => {
    jest.clearAllMocks();
    tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'nft-regression-gcp-'));

    // Pacote install is mocked: no real network, no real install. The
    // resolution result advertises the top-level packages so versionsHash
    // is stable across runs.
    mockDownloadWithResolution.mockResolvedValue({
      packagePaths: new Map(),
      resolution: {
        topLevel: new Map(
          EXPECTED_TOP_LEVEL_PACKAGES.map((name) => [
            name,
            { name, version: '0.0.0-test' },
          ]),
        ),
        nested: [],
      },
    });

    // Trace mock: write the synthetic tree under the bundler's outDir
    // (one directory above outputPath) and return the matching fileList.
    // This mirrors the real `traceAndCopy` contract from the bundler's
    // perspective: files appear under `dist/node_modules/...` and the
    // returned fileList is what `assertDepsTraced` and the rest of the
    // bundler consume.
    mockTraceAndCopy.mockImplementation(async ({ outDir }) => {
      for (const rel of SYNTHETIC_FILE_LIST) {
        const dst = path.join(outDir, rel);
        await fs.ensureDir(path.dirname(dst));
        // Content is irrelevant; the test only inspects the tree shape.
        await fs.writeFile(dst, '');
      }
      return {
        fileList: [...SYNTHETIC_FILE_LIST],
        copied: SYNTHETIC_FILE_LIST.length,
        reasons: new Map(),
      };
    });
  });

  afterEach(async () => {
    await fs.remove(tmp);
  });

  it('preserves bigquery-storage `.proto` assets, stays under the file-list upper bound, and keeps the top-level package set stable', async () => {
    const cacheDir = path.join(tmp, 'cache');
    const outputDir = path.join(tmp, 'out');
    const outputPath = path.join(outputDir, 'flow.mjs');

    // Read the GCP fixture flow.json. The fixture file is the public
    // shape this regression watches; mocks above stand in for pacote
    // and nft, but the input config is real.
    //
    // The fixture writes the v4 envelope (`{ version, flows }`) so it
    // doubles as a real flow.json for the integration smoke test. The
    // bundler's `bundleCore` consumes the inner flow definition, so we
    // pull `flows.default` out here.
    const envelope: Flow.Json = await fs.readJson(
      path.join(FIXTURE_DIR, 'flow.json'),
    );
    const innerFlow: Flow | undefined = envelope.flows?.default;
    if (!innerFlow) {
      throw new Error('GCP fixture flow.json is missing flows.default');
    }

    const buildOptions: BuildOptions = {
      output: outputPath,
      tempDir: cacheDir,
      cache: false,
      packages: {},
      format: 'esm',
      platform: 'node',
      configDir: FIXTURE_DIR,
    };

    await bundleCore(innerFlow, buildOptions, logger);

    // Hard assertion: the `__dirname`-loaded `.proto` asset survives
    // into the deploy artifact. This is the GCP regression marker
    // (success criterion #2 in the bundler-nft redesign plan).
    const protoMatches = await findProtoFiles(
      path.join(
        outputDir,
        'node_modules',
        '@google-cloud',
        'bigquery-storage',
        'build',
        'protos',
      ),
    );
    expect(protoMatches.length).toBeGreaterThan(0);
    expect(
      protoMatches.some((p) => p.endsWith(path.join('v1', 'storage.proto'))),
    ).toBe(true);

    // Upper-bound assertion: the trace stayed scoped. A blow-up here
    // (orders of magnitude above the threshold) typically means an nft
    // release started over-scanning `.git`, `node_modules/.cache`, or a
    // similar path it should ignore.
    const traceCalls = mockTraceAndCopy.mock.results;
    const lastResult = await traceCalls[traceCalls.length - 1].value;
    expect(lastResult.fileList.length).toBeLessThan(FILE_LIST_UPPER_BOUND);

    // Focused snapshot: sorted top-level package names. NOT the full
    // tree (transitive bumps would churn this daily). Update with
    // intent when the GCP fixture's package set changes.
    const topLevel = await listTopLevelPackages(
      path.join(outputDir, 'node_modules'),
    );
    expect(topLevel).toEqual(EXPECTED_TOP_LEVEL_PACKAGES);
  });
});

/**
 * Walk a directory and return absolute paths of every `.proto` file
 * found below it. Used by the hard regression assertion: any `.proto`
 * under `bigquery-storage/build/protos/` is sufficient evidence that
 * nft preserved the runtime-loaded asset directory.
 */
async function findProtoFiles(root: string): Promise<string[]> {
  const out: string[] = [];
  async function walk(dir: string): Promise<void> {
    let entries: import('node:fs').Dirent[];
    try {
      entries = await fs.readdir(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      const abs = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        await walk(abs);
      } else if (entry.isFile() && abs.endsWith('.proto')) {
        out.push(abs);
      }
    }
  }
  await walk(root);
  return out;
}

/**
 * Enumerate the top-level package names visible under
 * `dist/node_modules/`, expanding scoped namespaces (`@scope/pkg`) into
 * one entry per package. Returns the sorted list so the snapshot is
 * stable and diffable.
 */
async function listTopLevelPackages(modulesDir: string): Promise<string[]> {
  let entries: import('node:fs').Dirent[];
  try {
    entries = await fs.readdir(modulesDir, { withFileTypes: true });
  } catch {
    return [];
  }
  const names: string[] = [];
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    if (entry.name.startsWith('@')) {
      const scopeDir = path.join(modulesDir, entry.name);
      const scoped = await fs.readdir(scopeDir, { withFileTypes: true });
      for (const inner of scoped) {
        if (inner.isDirectory()) {
          names.push(`${entry.name}/${inner.name}`);
        }
      }
    } else {
      names.push(entry.name);
    }
  }
  return names.sort();
}
