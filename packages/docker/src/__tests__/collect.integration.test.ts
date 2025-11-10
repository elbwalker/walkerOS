/**
 * Collect Mode Integration Tests
 *
 * Tests the full end-to-end flow:
 * - Start collector with real config
 * - Send real HTTP events
 * - Verify processing
 * - Clean shutdown
 *
 * No mocks - tests actual Express server, collector, and destinations
 */

import { spawn, ChildProcess, execSync } from 'child_process';
import { join } from 'path';

describe('Collect Mode Integration', () => {
  let serverProcess: ChildProcess;
  let port: number;
  // Use process.cwd() which points to package root when running tests
  const projectRoot = process.cwd();

  // Build once before all tests
  beforeAll(() => {
    console.log('Building docker package...');
    try {
      execSync('npm run build', { cwd: projectRoot, stdio: 'inherit' });
      console.log('Build complete');
    } catch (error) {
      console.error('Build failed:', error);
      throw error;
    }
  });

  beforeEach(() => {
    // Use random port to avoid conflicts
    port = 8000 + Math.floor(Math.random() * 1000);
  });

  afterEach(async () => {
    // Clean up specific process (NOT killall!)
    if (serverProcess && !serverProcess.killed) {
      serverProcess.kill('SIGTERM');

      // Wait for graceful shutdown
      await new Promise<void>((resolve) => {
        const timeout = setTimeout(resolve, 5000);
        serverProcess.on('exit', () => {
          clearTimeout(timeout);
          resolve();
        });
      });
    }

    // Small delay to ensure port is released
    await new Promise((resolve) => setTimeout(resolve, 500));
  });

  it('should start server and respond to health checks', async () => {
    const configPath = join(projectRoot, 'configs/examples/collect-basic.json');

    // Start collect mode using built code (avoids Jest PIPEWRAP issue)
    serverProcess = spawn('node', ['dist/index.js'], {
      cwd: projectRoot,
      env: {
        ...process.env,
        MODE: 'collect',
        CONFIG_FILE: configPath,
        PORT: port.toString(),
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
    expect(healthData.source).toBe('express');
    expect(healthData.timestamp).toBeDefined();
  }, 20000);

  it('should respond to readiness checks', async () => {
    const configPath = join(projectRoot, 'configs/examples/collect-basic.json');

    serverProcess = spawn('node', ['dist/index.js'], {
      cwd: projectRoot,
      env: {
        ...process.env,
        MODE: 'collect',
        CONFIG_FILE: configPath,
        PORT: port.toString(),
      },
    });

    await waitForServer(`http://localhost:${port}/health`, 15000);

    // Test ready endpoint
    const readyRes = await fetch(`http://localhost:${port}/ready`);
    expect(readyRes.status).toBe(200);

    const readyData = (await readyRes.json()) as any;
    expect(readyData.status).toBe('ready');
  }, 20000);

  it('should collect and process events successfully', async () => {
    const configPath = join(projectRoot, 'configs/examples/collect-basic.json');

    serverProcess = spawn('node', ['dist/index.js'], {
      cwd: projectRoot,
      env: {
        ...process.env,
        MODE: 'collect',
        CONFIG_FILE: configPath,
        PORT: port.toString(),
      },
    });

    await waitForServer(`http://localhost:${port}/health`, 15000);

    // Send test event
    const event = {
      name: 'page view',
      data: {
        title: 'Test Page',
        path: '/test',
      },
      globals: {
        environment: 'test',
      },
    };

    const res = await fetch(`http://localhost:${port}/collect`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(event),
    });

    expect(res.status).toBe(200);

    const data = (await res.json()) as any;
    expect(data.success).toBe(true);
    expect(data.timestamp).toBeDefined();
    expect(typeof data.timestamp).toBe('number');
  }, 20000);

  it('should handle multiple concurrent events', async () => {
    const configPath = join(projectRoot, 'configs/examples/collect-basic.json');

    serverProcess = spawn('node', ['dist/index.js'], {
      cwd: projectRoot,
      env: {
        ...process.env,
        MODE: 'collect',
        CONFIG_FILE: configPath,
        PORT: port.toString(),
      },
    });

    await waitForServer(`http://localhost:${port}/health`, 15000);

    // Send multiple events concurrently
    const events = [
      { name: 'page view', data: { path: '/home' } },
      { name: 'product view', data: { id: 'P123', name: 'Laptop' } },
      { name: 'product add', data: { id: 'P123', quantity: 1 } },
      { name: 'order complete', data: { orderId: 'O456', total: 999.99 } },
    ];

    const requests = events.map((event) =>
      fetch(`http://localhost:${port}/collect`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(event),
      }),
    );

    const responses = await Promise.all(requests);

    // All should succeed
    responses.forEach((res) => {
      expect(res.status).toBe(200);
    });

    // Verify response bodies
    const results = await Promise.all(responses.map((r) => r.json()));
    results.forEach((result: any) => {
      expect(result.success).toBe(true);
      expect(result.timestamp).toBeDefined();
    });
  }, 20000);

  it('should handle CORS preflight requests', async () => {
    const configPath = join(projectRoot, 'configs/examples/collect-basic.json');

    serverProcess = spawn('node', ['dist/index.js'], {
      cwd: projectRoot,
      env: {
        ...process.env,
        MODE: 'collect',
        CONFIG_FILE: configPath,
        PORT: port.toString(),
      },
    });

    await waitForServer(`http://localhost:${port}/health`, 15000);

    // OPTIONS preflight request
    const res = await fetch(`http://localhost:${port}/collect`, {
      method: 'OPTIONS',
      headers: {
        Origin: 'https://example.com',
        'Access-Control-Request-Method': 'POST',
        'Access-Control-Request-Headers': 'Content-Type',
      },
    });

    expect(res.status).toBe(204);
    expect(res.headers.get('access-control-allow-origin')).toBeTruthy();
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
