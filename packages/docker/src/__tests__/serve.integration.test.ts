/**
 * Serve Mode Integration Tests
 *
 * Tests the static file serving flow:
 * - Start serve mode with real HTTP server
 * - Serve static files
 * - Verify file delivery
 * - Clean shutdown
 *
 * No mocks - tests actual Express static server
 */

import { spawn, ChildProcess, execSync } from 'child_process';
import { join } from 'path';
import { existsSync, mkdirSync, writeFileSync, rmSync } from 'fs';
import { tmpdir } from 'os';

describe('Serve Mode Integration', () => {
  let serverProcess: ChildProcess;
  let port: number;
  let staticDir: string;
  const projectRoot = process.cwd();

  // Build once before all tests (only if dist doesn't exist)
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
    // Use random port to avoid conflicts
    port = 8000 + Math.floor(Math.random() * 1000);

    // Create temporary static directory with test files
    staticDir = join(tmpdir(), `walker-serve-test-${Date.now()}`);
    mkdirSync(staticDir, { recursive: true });
  });

  afterEach(async () => {
    // Clean up server process
    if (serverProcess && !serverProcess.killed) {
      serverProcess.kill('SIGTERM');
      await new Promise((resolve) => setTimeout(resolve, 500));
    }

    // Clean up static directory
    if (existsSync(staticDir)) {
      rmSync(staticDir, { recursive: true, force: true });
    }
  });

  it('should start server and respond to health checks', async () => {
    const configPath = join(projectRoot, 'flows/serve.json');

    // Start serve mode
    serverProcess = spawn('node', ['dist/index.mjs'], {
      cwd: projectRoot,
      env: {
        ...process.env,
        MODE: 'serve',
        FLOW: configPath,
        PORT: port.toString(),
        STATIC_DIR: staticDir,
      },
    });

    // Capture output for debugging
    const output: string[] = [];
    serverProcess.stdout?.on('data', (data) => output.push(data.toString()));
    serverProcess.stderr?.on('data', (data) => output.push(data.toString()));
    serverProcess.on('error', (error) => console.error('Spawn error:', error));

    // Wait for server to start
    try {
      await waitForServer(`http://localhost:${port}/health`, 15000);
    } catch (error) {
      console.error('Server output:', output.join('\n'));
      throw error;
    }

    // Test health endpoint
    const healthRes = await fetch(`http://localhost:${port}/health`);
    expect(healthRes.status).toBe(200);

    const healthData = (await healthRes.json()) as any;
    expect(healthData.status).toBe('ok');
    expect(healthData.mode).toBe('serve');
    expect(healthData.timestamp).toBeDefined();
    expect(healthData.staticDir).toBe(staticDir);
  }, 20000);

  it('should serve static JavaScript files', async () => {
    // Create test JavaScript file
    const testContent =
      '// Test walker bundle\nwindow.walkerOS = { test: true };';
    writeFileSync(join(staticDir, 'walker.js'), testContent);

    const configPath = join(projectRoot, 'flows/serve.json');

    serverProcess = spawn('node', ['dist/index.mjs'], {
      cwd: projectRoot,
      env: {
        ...process.env,
        MODE: 'serve',
        FLOW: configPath,
        PORT: port.toString(),
        STATIC_DIR: staticDir,
      },
    });

    await waitForServer(`http://localhost:${port}/health`, 15000);

    // Request static file
    const fileRes = await fetch(`http://localhost:${port}/walker.js`);
    expect(fileRes.status).toBe(200);

    const fileContent = await fileRes.text();
    expect(fileContent).toBe(testContent);

    // Verify Content-Type header
    expect(fileRes.headers.get('content-type')).toMatch(
      /javascript|text\/plain/,
    );
  }, 20000);

  it('should serve multiple static files', async () => {
    // Create multiple test files
    writeFileSync(join(staticDir, 'walker.js'), 'console.log("walker");');
    writeFileSync(join(staticDir, 'config.json'), '{"test": true}');
    writeFileSync(
      join(staticDir, 'index.html'),
      '<html><body>Test</body></html>',
    );

    const configPath = join(projectRoot, 'flows/serve.json');

    serverProcess = spawn('node', ['dist/index.mjs'], {
      cwd: projectRoot,
      env: {
        ...process.env,
        MODE: 'serve',
        FLOW: configPath,
        PORT: port.toString(),
        STATIC_DIR: staticDir,
      },
    });

    await waitForServer(`http://localhost:${port}/health`, 15000);

    // Request all files
    const [jsRes, jsonRes, htmlRes] = await Promise.all([
      fetch(`http://localhost:${port}/walker.js`),
      fetch(`http://localhost:${port}/config.json`),
      fetch(`http://localhost:${port}/index.html`),
    ]);

    // All should succeed
    expect(jsRes.status).toBe(200);
    expect(jsonRes.status).toBe(200);
    expect(htmlRes.status).toBe(200);

    // Verify content
    expect(await jsRes.text()).toContain('walker');
    expect(await jsonRes.text()).toContain('test');
    expect(await htmlRes.text()).toContain('Test');
  }, 20000);

  it('should return 404 for non-existent files', async () => {
    const configPath = join(projectRoot, 'flows/serve.json');

    serverProcess = spawn('node', ['dist/index.mjs'], {
      cwd: projectRoot,
      env: {
        ...process.env,
        MODE: 'serve',
        FLOW: configPath,
        PORT: port.toString(),
        STATIC_DIR: staticDir,
      },
    });

    await waitForServer(`http://localhost:${port}/health`, 15000);

    // Request non-existent file
    const res = await fetch(`http://localhost:${port}/nonexistent.js`);
    expect(res.status).toBe(404);
  }, 20000);
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
        // Extra delay to ensure server is fully ready
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
