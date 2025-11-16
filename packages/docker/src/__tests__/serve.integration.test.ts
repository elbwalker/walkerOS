/**
 * Serve Mode Integration Tests
 *
 * Tests the static file server functionality
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

    // Create test static directory
    const testDir = join(projectRoot, '.tmp/test-static');
    if (!existsSync(testDir)) {
      mkdirSync(testDir, { recursive: true });
      writeFileSync(
        join(testDir, 'index.html'),
        '<html><body>Test Page</body></html>',
      );
      writeFileSync(join(testDir, 'test.txt'), 'Hello World');
    }
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

  it('should start static file server', async () => {
    const staticDir = join(projectRoot, '.tmp/test-static');

    serverProcess = spawn('node', ['dist/index.mjs'], {
      cwd: projectRoot,
      env: {
        ...process.env,
        MODE: 'serve',
        STATIC_DIR: staticDir,
        PORT: port.toString(),
      },
    });

    // Wait for server to be ready
    await waitForServer(`http://localhost:${port}/health`, 10000);

    const healthRes = await fetch(`http://localhost:${port}/health`);
    expect(healthRes.status).toBe(200);

    const health = (await healthRes.json()) as any;
    expect(health.status).toBe('ok');
    expect(health.mode).toBe('serve');
  }, 15000);

  it('should serve static files', async () => {
    const staticDir = join(projectRoot, '.tmp/test-static');

    serverProcess = spawn('node', ['dist/index.mjs'], {
      cwd: projectRoot,
      env: {
        ...process.env,
        MODE: 'serve',
        STATIC_DIR: staticDir,
        PORT: port.toString(),
      },
    });

    await waitForServer(`http://localhost:${port}/health`, 10000);

    // Test serving HTML file
    const htmlRes = await fetch(`http://localhost:${port}/index.html`);
    expect(htmlRes.status).toBe(200);
    const html = await htmlRes.text();
    expect(html).toContain('Test Page');

    // Test serving text file
    const txtRes = await fetch(`http://localhost:${port}/test.txt`);
    expect(txtRes.status).toBe(200);
    const txt = await txtRes.text();
    expect(txt).toBe('Hello World');
  }, 15000);

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
