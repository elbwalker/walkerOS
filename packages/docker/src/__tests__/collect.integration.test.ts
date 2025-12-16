/**
 * Collect Mode Integration Tests
 *
 * Tests the pure runtime flow executor:
 * - Runs with pre-built flow bundles
 * - No bundling at runtime
 * - Tests Express server, collector, and event processing
 *
 * Note: Uses Docker's own static demo bundles (demos/demo-collect.mjs)
 * These are committed to the package for quick-start testing
 */

import { spawn, ChildProcess, execSync } from 'child_process';
import { join } from 'path';
import { existsSync } from 'fs';

describe('Collect Mode Integration', () => {
  let serverProcess: ChildProcess;
  const port = 8080;
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

  afterEach(async () => {
    if (serverProcess && !serverProcess.killed) {
      serverProcess.kill('SIGTERM');
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
  });

  it('should start server with pre-built bundle', async () => {
    // Use Docker's own static demo bundle
    const bundlePath = join(projectRoot, 'demos/demo-collect.mjs');

    // Verify bundle exists
    expect(existsSync(bundlePath)).toBe(true);

    serverProcess = spawn('node', ['dist/index.mjs'], {
      cwd: projectRoot,
      env: {
        ...process.env,
        MODE: 'collect',
        FILE: bundlePath,
        PORT: port.toString(),
      },
    });

    await waitForServer(`http://localhost:${port}/health`, 15000);

    const healthRes = await fetch(`http://localhost:${port}/health`);
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

  it('should have correct TypeScript types exported', async () => {
    // This ensures the types are properly exported
    const dockerModule = await import('../index');

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
