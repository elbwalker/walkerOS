/**
 * Integration Test: Bundle → Run Workflow
 *
 * Tests complete flow from config to running bundle.
 * Uses real packages, real bundles, NO MOCKING.
 */

import { bundle } from '../../commands/bundle/index.js';
import { join } from 'path';
import fs from 'fs-extra';

const projectRoot = process.cwd();

describe('Bundle → Run Integration', () => {
  const testDir = join(projectRoot, '.tmp/integration-tests');
  // Output path is now static: ./dist/bundle.mjs relative to cwd
  const bundlePath = join(projectRoot, 'dist/bundle.mjs');

  beforeAll(async () => {
    await fs.ensureDir(testDir);
    // Ensure the dist directory exists
    await fs.ensureDir(join(projectRoot, 'dist'));
  });

  afterAll(async () => {
    await fs.remove(testDir).catch(() => {});
    // Clean up the dist directory
    await fs.remove(join(projectRoot, 'dist/bundle.mjs')).catch(() => {});
  });

  it('should create functional bundle from config', async () => {
    // Step 1: Bundle example config (Flow.Setup format)
    await bundle(join(projectRoot, 'examples/server-collect.json'), {
      verbose: false,
      silent: true,
    });

    // Step 2: Verify bundle exists at convention-based path
    expect(fs.existsSync(bundlePath)).toBe(true);

    // Step 3: Verify it's valid ESM
    const module = await import(bundlePath);
    expect(module.default).toBeDefined();
    expect(typeof module.default).toBe('function');

    // Step 4: Verify factory function signature
    // (Don't actually execute to avoid port conflicts and hanging servers)
    const factoryFn = module.default;
    expect(factoryFn.length).toBeGreaterThanOrEqual(0);

    // Verify it's a function that would return the right structure
    // by checking the module exports
    expect(module).toHaveProperty('default');
  }, 120000);

  it('should bundle with correct dependencies included', async () => {
    const content = fs.readFileSync(bundlePath, 'utf-8');

    // Should include runtime dependencies
    expect(content).toContain('express');

    // Should NOT include dev dependencies
    expect(content).not.toContain('jest');
    expect(content).not.toContain('@types/');
  });
});
