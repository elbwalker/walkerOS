/**
 * Serve Mode Integration Tests
 *
 * Tests the single-file server functionality
 */

import { spawn, ChildProcess, execSync } from 'child_process';
import { join } from 'path';
import { existsSync, mkdirSync, writeFileSync } from 'fs';

describe('Serve Mode Integration', () => {
  let serverProcess: ChildProcess;
  let port: number;
  const projectRoot = process.cwd();

  // Build Docker package before all tests
  beforeAll(() => {
    const distPath = join(projectRoot, 'dist/index.mjs');

    if (!existsSync(distPath)) {
      console.log('Building docker package...');
      execSync('npm run build', { cwd: projectRoot, stdio: 'inherit' });
    }

    // Create test file
    const testDir = join(projectRoot, '.tmp');
    if (!existsSync(testDir)) {
      mkdirSync(testDir, { recursive: true });
    }
    writeFileSync(
      join(testDir, 'test-bundle.js'),
      '(function(){console.log("test bundle");})();',
    );
  });

  beforeEach(() => {
    port = 9000 + Math.floor(Math.random() * 1000);
  });

  afterEach(async () => {
    if (serverProcess && !serverProcess.killed) {
      serverProcess.kill('SIGTERM');
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
  });

  it('should start single-file server with default settings', async () => {
    const filePath = join(projectRoot, '.tmp/test-bundle.js');

    serverProcess = spawn('node', ['dist/index.mjs'], {
      cwd: projectRoot,
      env: {
        ...process.env,
        MODE: 'serve',
        FILE: filePath,
        PORT: port.toString(),
      },
    });

    // Capture output for debugging
    serverProcess.stdout?.on('data', (data) => {
      console.log(`[Server stdout]: ${data}`);
    });
    serverProcess.stderr?.on('data', (data) => {
      console.error(`[Server stderr]: ${data}`);
    });

    // Wait for server to be ready (longer timeout for CI)
    await waitForServer(`http://localhost:${port}/health`, 30000);

    const healthRes = await fetch(`http://localhost:${port}/health`);
    expect(healthRes.status).toBe(200);

    const health = (await healthRes.json()) as any;
    expect(health.status).toBe('ok');
    expect(health.mode).toBe('serve');
    expect(health.file).toBe(filePath);
    expect(health.url).toBe('/walker.js');
  }, 35000);

  it('should serve single file at default URL', async () => {
    const filePath = join(projectRoot, '.tmp/test-bundle.js');

    serverProcess = spawn('node', ['dist/index.mjs'], {
      cwd: projectRoot,
      env: {
        ...process.env,
        MODE: 'serve',
        FILE: filePath,
        PORT: port.toString(),
      },
    });

    // Capture output for debugging
    serverProcess.stdout?.on('data', (data) => {
      console.log(`[Server stdout]: ${data}`);
    });
    serverProcess.stderr?.on('data', (data) => {
      console.error(`[Server stderr]: ${data}`);
    });

    await waitForServer(`http://localhost:${port}/health`, 30000);

    // Test serving bundle at default /walker.js
    const bundleRes = await fetch(`http://localhost:${port}/walker.js`);
    expect(bundleRes.status).toBe(200);
    const bundle = await bundleRes.text();
    expect(bundle).toContain('test bundle');
  }, 35000);

  it('should serve file with custom name and path', async () => {
    const filePath = join(projectRoot, '.tmp/test-bundle.js');

    serverProcess = spawn('node', ['dist/index.mjs'], {
      cwd: projectRoot,
      env: {
        ...process.env,
        MODE: 'serve',
        FILE: filePath,
        SERVE_NAME: 'custom.js',
        SERVE_PATH: 'libs/v1',
        PORT: port.toString(),
      },
    });

    // Capture output for debugging
    serverProcess.stdout?.on('data', (data) => {
      console.log(`[Server stdout]: ${data}`);
    });
    serverProcess.stderr?.on('data', (data) => {
      console.error(`[Server stderr]: ${data}`);
    });

    await waitForServer(`http://localhost:${port}/health`, 30000);

    // Test health endpoint shows custom URL
    const healthRes = await fetch(`http://localhost:${port}/health`);
    const health = (await healthRes.json()) as any;
    expect(health.url).toBe('/libs/v1/custom.js');

    // Test serving bundle at custom URL
    const bundleRes = await fetch(`http://localhost:${port}/libs/v1/custom.js`);
    expect(bundleRes.status).toBe(200);
    const bundle = await bundleRes.text();
    expect(bundle).toContain('test bundle');
  }, 35000);

  it('should export runServeMode function', async () => {
    const dockerModule = await import('../index');

    expect(dockerModule.runServeMode).toBeDefined();
    expect(typeof dockerModule.runServeMode).toBe('function');
  });
});

async function waitForServer(url: string, timeout: number): Promise<void> {
  const start = Date.now();

  while (Date.now() - start < timeout) {
    try {
      const res = await fetch(url);
      if (res.ok) {
        await new Promise((resolve) => setTimeout(resolve, 300));
        return;
      }
    } catch {
      // Server not ready
    }

    await new Promise((resolve) => setTimeout(resolve, 300));
  }

  throw new Error(`Server did not start within ${timeout}ms`);
}
