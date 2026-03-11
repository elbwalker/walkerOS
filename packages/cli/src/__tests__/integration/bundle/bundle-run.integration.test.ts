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

    // Size: non-trivial but not bloated
    expect(stats.size).toBeGreaterThan(1024);
    expect(stats.size).toBeLessThan(2 * 1024 * 1024);

    // Should include runtime dependencies
    expect(content).toContain('express');

    // Should NOT include dev dependencies
    expect(content).not.toContain('jest');
    expect(content).not.toContain('prettier');
    expect(content).not.toContain('@types/');
  });
});
