import { spawn } from 'child_process';
import fs from 'fs-extra';
import path from 'path';
import { getId } from '@walkeros/core';

describe('CLI Bundle Command', () => {
  const testOutputDir = path.join('.tmp', `cli-${Date.now()}-${getId()}`);
  const testConfigPath = path.join(testOutputDir, 'test.config.json');

  beforeEach(async () => {
    await fs.ensureDir(testOutputDir);
    // Mock console.log and console.error to suppress output during tests
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(async () => {
    await fs.remove(testOutputDir);
    // Restore console methods
    jest.restoreAllMocks();
  });

  const runCLI = (
    args: string[],
  ): Promise<{ stdout: string; stderr: string; exitCode: number }> => {
    return new Promise((resolve) => {
      const child = spawn('node', ['dist/index.cjs', ...args], {
        stdio: 'pipe',
        shell: false,
      });

      let stdout = '';
      let stderr = '';

      child.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      child.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      child.on('close', (exitCode) => {
        resolve({ stdout, stderr, exitCode: exitCode || 0 });
      });
    });
  };

  it('should output JSON format for successful bundle', async () => {
    // Create a test config
    const testConfig = {
      platform: 'web',
      packages: {
        '@walkeros/core': { imports: ['getId'] },
      },
      code: 'export const test = getId();',
      output: path.join(testOutputDir, 'test.js'),
    };

    await fs.writeJson(testConfigPath, testConfig);

    const result = await runCLI([
      'bundle',
      '--config',
      testConfigPath,
      '--json',
    ]);

    expect(result.exitCode).toBe(0);

    const output = JSON.parse(result.stdout);
    expect(output).toMatchObject({
      success: true,
      data: {
        stats: {
          totalSize: expect.any(Number),
          packages: expect.any(Array),
          buildTime: expect.any(Number),
          treeshakingEffective: expect.any(Boolean),
        },
      },
      duration: expect.any(Number),
    });

    expect(output.data.stats.packages).toHaveLength(1);
    expect(output.data.stats.packages[0].name).toBe('@walkeros/core@latest');
  });

  it('should output JSON format for failed bundle', async () => {
    // Create a test config with syntax error
    const testConfig = {
      platform: 'web',
      packages: {
        '@walkeros/core': { imports: ['getId'] },
      },
      code: 'export const badCode = () => {\n  return getId([1,2,3] x => x * 2);\n};',
      output: path.join(testOutputDir, 'error-test.js'),
    };

    await fs.writeJson(testConfigPath, testConfig);

    const result = await runCLI([
      'bundle',
      '--config',
      testConfigPath,
      '--json',
    ]);

    expect(result.exitCode).toBe(1);

    const output = JSON.parse(result.stdout);
    expect(output).toMatchObject({
      success: false,
      error: expect.stringContaining('Code syntax error'),
      duration: expect.any(Number),
    });

    expect(output.error).toContain('line 4, column 23');
  });

  it('should output JSON format when config file not found', async () => {
    const result = await runCLI([
      'bundle',
      '--config',
      'nonexistent.json',
      '--json',
    ]);

    expect(result.exitCode).toBe(1);

    const output = JSON.parse(result.stdout);
    expect(output).toMatchObject({
      success: false,
      error: expect.stringContaining('Configuration file not found'),
    });
  });

  it('should collect stats when --json flag is used (implies --stats)', async () => {
    const testConfig = {
      platform: 'web',
      packages: { '@walkeros/core': { imports: ['getId'] } },
      code: 'export const test = getId;',
      output: path.join(testOutputDir, 'wildcard-test.js'),
    };

    await fs.writeJson(testConfigPath, testConfig);

    const result = await runCLI([
      'bundle',
      '--config',
      testConfigPath,
      '--json',
    ]);

    expect(result.exitCode).toBe(0);

    const output = JSON.parse(result.stdout);
    expect(output.success).toBe(true);
    expect(output.data.stats.treeshakingEffective).toBe(true); // Should be effective with named imports
  });

  it('should suppress decorative output in JSON mode', async () => {
    const testConfig = {
      platform: 'web',
      packages: { '@walkeros/core': { imports: ['getId'] } },
      code: 'export const test = getId();',
      output: path.join(testOutputDir, 'minimal-test.js'),
    };

    await fs.writeJson(testConfigPath, testConfig);

    const result = await runCLI([
      'bundle',
      '--config',
      testConfigPath,
      '--json',
    ]);

    expect(result.exitCode).toBe(0);

    // Should not contain decorative messages
    expect(result.stdout).not.toContain('📦 Reading configuration');
    expect(result.stdout).not.toContain('🔧 Starting bundle process');
    expect(result.stdout).not.toContain('✅ Bundle created successfully');

    // Should be valid JSON
    const output = JSON.parse(result.stdout);
    expect(output.success).toBe(true);
  });
});

describe('CLI Simulate Command', () => {
  const testConfigPath = path.join(
    __dirname,
    '../../examples/web-ecommerce.json',
  );

  beforeEach(() => {
    // Mock console.log and console.error to suppress output during tests
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    // Restore console methods
    jest.restoreAllMocks();
  });

  const runCLI = (
    args: string[],
  ): Promise<{ stdout: string; stderr: string; exitCode: number }> => {
    return new Promise((resolve) => {
      const child = spawn('node', ['dist/index.cjs', ...args], {
        stdio: 'pipe',
        shell: false,
      });

      let stdout = '';
      let stderr = '';

      child.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      child.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      child.on('close', (exitCode) => {
        resolve({ stdout, stderr, exitCode: exitCode || 0 });
      });
    });
  };

  it('should output JSON format for simulation', async () => {
    const result = await runCLI([
      'simulate',
      '--config',
      testConfigPath,
      '--event',
      '{"name":"product view","data":{"id":"P123"}}',
      '--json',
    ]);

    expect(result.exitCode).toBe(0);

    const output = JSON.parse(result.stdout);
    expect(output).toMatchObject({
      result: {
        ok: true,
        successful: expect.arrayContaining([
          expect.objectContaining({ id: 'gtag' }),
          expect.objectContaining({ id: 'api' }),
        ]),
        queued: [],
        failed: [],
        event: expect.objectContaining({
          name: 'product view',
          data: { id: 'P123' },
        }),
      },
      usage: {
        gtag: expect.any(Array),
        api: expect.any(Array),
      },
      duration: expect.any(Number),
    });

    // Verify gtag API calls
    expect(output.usage.gtag.length).toBeGreaterThan(0);
    expect(output.usage.gtag[0]).toMatchObject({
      type: 'call',
      path: 'window.gtag',
      timestamp: expect.any(Number),
      args: expect.any(Array),
    });

    // Verify api API calls
    expect(output.usage.api.length).toBeGreaterThan(0);
    expect(output.usage.api[0]).toMatchObject({
      type: 'call',
      path: 'sendWeb',
      timestamp: expect.any(Number),
      args: expect.any(Array),
    });
  });
});
