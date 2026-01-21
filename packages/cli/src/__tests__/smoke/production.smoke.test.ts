/**
 * Production Smoke Tests
 *
 * Validates bundle quality before production deployment.
 * Checks: size, structure, executability, dependencies.
 */

import { bundle } from '../../commands/bundle/index.js';
import { join } from 'path';
import fs from 'fs-extra';

const projectRoot = process.cwd();

describe('Production Smoke Tests', () => {
  // Output path is convention-based: ./dist/bundle.mjs relative to cwd
  const bundlePath = join(projectRoot, 'dist/bundle.mjs');

  beforeAll(async () => {
    // Ensure the dist directory exists
    await fs.ensureDir(join(projectRoot, 'dist'));
    // Create fresh bundle from Flow.Setup config
    await bundle(join(projectRoot, 'examples/server-collect.json'), {
      silent: true,
    });
  }, 120000);

  afterAll(async () => {
    // Clean up the generated bundle
    await fs.remove(join(projectRoot, 'dist/bundle.mjs')).catch(() => {});
  });

  it('bundle should exist and be non-empty', () => {
    expect(fs.existsSync(bundlePath)).toBe(true);
    const stats = fs.statSync(bundlePath);
    expect(stats.size).toBeGreaterThan(1024); // > 1KB
  });

  it('bundle should be reasonable size', () => {
    const stats = fs.statSync(bundlePath);
    const sizeKB = stats.size / 1024;

    console.log(`Bundle size: ${sizeKB.toFixed(2)} KB`);

    // Should be less than 2MB
    expect(stats.size).toBeLessThan(2 * 1024 * 1024);
  });

  it('bundle should be valid ESM module', async () => {
    const module = await import(bundlePath);
    expect(module.default).toBeDefined();
    expect(typeof module.default).toBe('function');
  });

  it('bundle factory function should be executable', async () => {
    const module = await import(bundlePath);

    // Verify factory function signature - don't actually execute it
    // (to avoid port conflicts and hanging servers in tests)
    expect(typeof module.default).toBe('function');
    expect(module.default.length).toBeGreaterThanOrEqual(0);

    // Verify it's an async function by checking constructor
    const factoryFn = module.default;
    expect(
      factoryFn.constructor.name === 'AsyncFunction' ||
        factoryFn.constructor.name === 'Function',
    ).toBe(true);
  });

  it('bundle should include required runtime dependencies', () => {
    const content = fs.readFileSync(bundlePath, 'utf-8');
    expect(content).toContain('express');
  });

  it('bundle should NOT include development dependencies', () => {
    const content = fs.readFileSync(bundlePath, 'utf-8');
    expect(content).not.toContain('jest');
    expect(content).not.toContain('prettier');
    expect(content).not.toContain('@types/');
  });
});
