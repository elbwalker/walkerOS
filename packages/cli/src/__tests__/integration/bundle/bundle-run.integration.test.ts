/**
 * Integration Test: Bundle → Run Workflow
 *
 * Tests complete flow from config to running bundle.
 * Uses real packages, real bundles, NO MOCKING.
 */

import { bundle } from '../../../commands/bundle/index.js';
import { join, resolve } from 'path';
import fs from 'fs-extra';

// Resolve paths relative to test file, not cwd (which is monorepo root)
const cliRoot = resolve(__dirname, '../../../..');
const configPath = join(cliRoot, 'examples/server-collect.json');

describe('Bundle → Run Integration', () => {
  const testDir = join(cliRoot, '.tmp/integration-tests');
  const bundlePath = join(testDir, 'bundle.mjs');

  beforeAll(async () => {
    await fs.ensureDir(testDir);
  });

  afterAll(async () => {
    await fs.remove(testDir).catch(() => {});
  });

  it('should create functional bundle from config', async () => {
    await bundle(configPath, {
      verbose: false,
      silent: true,
      buildOverrides: { output: bundlePath },
    });

    expect(fs.existsSync(bundlePath)).toBe(true);

    // Verify valid ESM module with callable factory
    const module = await import(bundlePath);
    expect(module.default).toBeDefined();
    expect(typeof module.default).toBe('function');
    expect(module.default.length).toBeGreaterThanOrEqual(0);
  }, 120000);

  it('should produce a production-quality bundle', () => {
    const stats = fs.statSync(bundlePath);
    const content = fs.readFileSync(bundlePath, 'utf-8');

    // Size: non-trivial but not bloated. Step packages are externalized
    // (kept as bare imports) and copied alongside via the nft trace step,
    // so the bundle itself stays small.
    expect(stats.size).toBeGreaterThan(1024);
    expect(stats.size).toBeLessThan(2 * 1024 * 1024);

    // Step packages stay as bare imports (esbuild externalizes them); the
    // sibling node_modules/ holds the actual code via nft tracing.
    // Minified output may emit `from"…"` without intervening whitespace,
    // so accept both forms.
    expect(content).toMatch(/from\s*['"]@walkeros\/server-source-express['"]/);

    // Should NOT include dev dependencies
    expect(content).not.toContain('jest');
    expect(content).not.toContain('prettier');
    expect(content).not.toContain('@types/');
  });

  it('should not inline step package source into the entry bundle', () => {
    // Decision #9 (bundler-nft-redesign): esbuild externalizes ALL step
    // packages so the entry bundle stays small. nft traces the bare
    // imports and copies the package code into the sibling
    // `node_modules/`. Without this externalization, every step package
    // is double-counted (inlined in the bundle AND copied via nft).
    //
    // Heuristic: a real express source bundle inlines >100 KB of CJS
    // wrappers when express is bundled, so a strict ceiling well below
    // that catches the regression.
    const stats = fs.statSync(bundlePath);
    expect(stats.size).toBeLessThan(75 * 1024);
  });
});
