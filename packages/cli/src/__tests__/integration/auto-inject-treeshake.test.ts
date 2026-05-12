/**
 * Phase 4.4: Tree-shaking proof for the `validate:` step primitive.
 *
 * This test is the load-bearing empirical check for the architectural decision
 * (Strategy C — keep the validator out of core runtime, auto-inject when
 * `validate:` appears, preserve package-isolation tree-shaking).
 *
 * Two cases:
 *   1. No `validate:` anywhere → bundle MUST NOT contain AJV references.
 *      Proves auto-injection is a true no-op when unused.
 *   2. One step has `validate:` → bundle MUST contain AJV references.
 *      Proves auto-injection actually pulls the validator package in.
 *
 * Uses the programmatic `bundle()` API (matches `size-budget.test.ts` /
 * `cdn-jsdom.test.ts` style) — no shelling out to a globally installed
 * `walkeros` binary, no PATH dependence, safe for CI.
 *
 * Bundling installs packages via pacote; allow 120s timeouts to match
 * sibling integration tests.
 */
import { readFile, mkdtemp, rm } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';

import { bundle } from '../../commands/bundle/index.js';

const AJV_TOKEN = 'ajv';

describe('Validator auto-injection — tree-shaking proof', () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await mkdtemp(join(tmpdir(), 'wos-treeshake-'));
  });

  afterEach(async () => {
    await rm(tmpDir, { recursive: true, force: true }).catch(() => {});
  });

  it('no validate: anywhere → bundle contains no AJV (tree-shaking baseline)', async () => {
    const out = join(tmpDir, 'walker.js');
    await bundle(
      {
        version: 4,
        flows: {
          default: {
            config: { platform: 'web' },
            sources: {
              browser: {
                package: '@walkeros/web-source-browser',
                config: {
                  settings: {
                    prefix: 'data-elb',
                    pageview: true,
                    elb: 'elb',
                    elbLayer: 'elbLayer',
                  },
                },
              },
            },
            destinations: {
              api: {
                package: '@walkeros/web-destination-api',
                config: {
                  settings: {
                    url: 'https://example.com/events',
                    method: 'POST',
                    transport: 'fetch',
                  },
                },
              },
            },
          },
        },
      },
      {
        target: 'cdn',
        silent: true,
        cache: false,
        buildOverrides: { output: out },
      },
    );
    const text = await readFile(out, 'utf8');
    // Case-insensitive: AJV identifiers may appear as `Ajv`, `ajv`, etc.
    expect(text.toLowerCase()).not.toContain(AJV_TOKEN);
  }, 120000);

  it('one step uses validate: → bundle contains AJV (auto-injection works)', async () => {
    const out = join(tmpDir, 'walker.js');
    await bundle(
      {
        version: 4,
        flows: {
          default: {
            config: { platform: 'web' },
            sources: {
              browser: {
                package: '@walkeros/web-source-browser',
                config: {
                  settings: {
                    prefix: 'data-elb',
                    pageview: true,
                    elb: 'elb',
                    elbLayer: 'elbLayer',
                  },
                },
              },
            },
            destinations: {
              api: {
                package: '@walkeros/web-destination-api',
                validate: { format: true },
                config: {
                  settings: {
                    url: 'https://example.com/events',
                    method: 'POST',
                    transport: 'fetch',
                  },
                },
              },
            },
          },
        },
      },
      {
        target: 'cdn',
        silent: true,
        cache: false,
        buildOverrides: { output: out },
      },
    );
    const text = await readFile(out, 'utf8');
    expect(text.toLowerCase()).toContain(AJV_TOKEN);
  }, 120000);
});
