/**
 * Collect Mode Integration Tests
 *
 * Tests the pure runtime flow executor:
 * - Runs with pre-built flow bundles
 * - No bundling at runtime
 * - Tests Express server, collector, and event processing
 *
 * Note: These tests require pre-built bundles from @walkeros/cli
 * In real usage, bundles are generated separately before deployment
 */

import { spawn, ChildProcess, execSync } from 'child_process';
import { join } from 'path';
import { existsSync } from 'fs';

describe('Collect Mode Integration', () => {
  let serverProcess: ChildProcess;
  let port: number;
  const projectRoot = process.cwd();

  // Build Docker package before all tests
  beforeAll(() => {
    const distPath = join(projectRoot, 'dist/index.mjs');
    const distExists = existsSync(distPath);

    if (!distExists) {
      console.log('Building docker package...');
      try {
        execSync('npm run build', { cwd: projectRoot, stdio: 'inherit' });
        console.log('Build complete');
      } catch (error) {
        console.error('Build failed:', error);
        throw error;
      }
    }
  });

  beforeEach(() => {
    port = 8000 + Math.floor(Math.random() * 1000);
  });

  afterEach(async () => {
    if (serverProcess && !serverProcess.killed) {
      serverProcess.kill('SIGTERM');
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
  });

  it('should start server with pre-built bundle', async () => {
    // Use pre-built bundle from CLI package
    const bundlePath = join(projectRoot, '../cli/examples/server-simple.mjs');

    // Verify bundle exists
    expect(existsSync(bundlePath)).toBe(true);

    serverProcess = spawn('node', ['dist/index.mjs'], {
      cwd: projectRoot,
      env: {
        ...process.env,
        MODE: 'collect',
        FLOW: bundlePath, // Pre-built bundle from CLI
        PORT: port.toString(),
      },
    });

    // The bundle has sourceExpress configured with port 8080
    // Health endpoint is provided by the source, not Docker runtime
    await waitForServer(`http://localhost:8080/health`, 15000);

    const healthRes = await fetch(`http://localhost:8080/health`);
    expect(healthRes.status).toBe(200);

    const health = (await healthRes.json()) as any;
    expect(health.status).toBe('ok');
    expect(health.source).toBe('express');
  }, 20000);

  // Unit test for the runFlow function (doesn't require full server)
  it('should export runFlow function', async () => {
    // Verify exports are available
    const dockerModule = await import('../index');

    expect(dockerModule.runFlow).toBeDefined();
    expect(typeof dockerModule.runFlow).toBe('function');
    expect(dockerModule.runServeMode).toBeDefined();
    expect(typeof dockerModule.runServeMode).toBe('function');
  });

  it('should have correct TypeScript types exported', () => {
    // This ensures the types are properly exported for CLI usage
    const dockerModule = require('../index');

    expect(dockerModule).toHaveProperty('runFlow');
    expect(dockerModule).toHaveProperty('runServeMode');
  });
});

/**
 * Helper to wait for server to be ready
 */
async function waitForServer(url: string, timeout: number): Promise<void> {
  const start = Date.now();

  while (Date.now() - start < timeout) {
    try {
      const res = await fetch(url);
      if (res.ok) {
        await new Promise((resolve) => setTimeout(resolve, 500));
        return;
      }
    } catch {
      // Server not ready yet, keep trying
    }

    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  throw new Error(`Server did not start within ${timeout}ms at ${url}`);
}
