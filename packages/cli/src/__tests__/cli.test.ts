import { spawn } from 'child_process';
import { existsSync } from 'fs';
import fs from 'fs-extra';
import path from 'path';
import { getId } from '@walkeros/core';

// Resolve paths relative to the cli package root (two levels up from __tests__)
// so the test works regardless of Jest's cwd.
const pkgRoot = path.resolve(__dirname, '..', '..');
const cliPath = path.join(pkgRoot, 'dist/index.js');

// Skip when dist/ doesn't exist (turbo runs test without build).
// These tests run via `npm run test:integration` which builds first.
// If you add a new test file that spawns dist/index.js, add its pattern
// to the test:integration script in package.json.
const describeIfBuilt = existsSync(cliPath) ? describe : describe.skip;

describeIfBuilt('CLI Bundle Command', () => {
  const testOutputDir = path.join(
    pkgRoot,
    '.tmp',
    `cli-${Date.now()}-${getId()}`,
  );
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
      const child = spawn(
        'node',
        [path.join(pkgRoot, 'dist/index.js'), ...args],
        {
          stdio: 'pipe',
          shell: false,
          cwd: pkgRoot,
        },
      );

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
    // Flow.Setup format
    const testConfig = {
      version: 1,
      flows: {
        default: {
          web: {},
          packages: {
            '@walkeros/core': { imports: ['getId'] },
          },
        },
      },
    };

    await fs.writeJson(testConfigPath, testConfig);

    const result = await runCLI(['bundle', testConfigPath, '--json']);

    expect(result.exitCode).toBe(0);

    const output = JSON.parse(result.stdout);
    expect(output).toMatchObject({
      success: true,
      data: {
        flows: expect.arrayContaining([
          {
            flowName: 'default',
            success: true,
            stats: {
              totalSize: expect.any(Number),
              packages: expect.any(Array),
              buildTime: expect.any(Number),
              treeshakingEffective: expect.any(Boolean),
            },
          },
        ]),
        summary: {
          total: 1,
          success: 1,
          failed: 0,
        },
      },
      duration: expect.any(Number),
    });

    expect(output.data.flows[0].stats.packages).toHaveLength(1);
    expect(output.data.flows[0].stats.packages[0].name).toBe(
      '@walkeros/core@latest',
    );
  }, 120000);

  it('should output JSON format for failed bundle (invalid syntax)', async () => {
    // Flow.Setup format - but bundler will fail on invalid destination code
    const testConfig = {
      version: 1,
      flows: {
        default: {
          web: {},
          packages: {
            '@walkeros/nonexistent-package-xyz': { imports: ['nonexistent'] },
          },
        },
      },
    };

    await fs.writeJson(testConfigPath, testConfig);

    const result = await runCLI(['bundle', testConfigPath, '--json']);

    expect(result.exitCode).toBe(1);

    const output = JSON.parse(result.stdout);
    expect(output).toMatchObject({
      success: false,
      error: expect.any(String),
      duration: expect.any(Number),
    });
  });

  it('should output JSON format when config file not found', async () => {
    const result = await runCLI(['bundle', 'nonexistent.json', '--json']);

    expect(result.exitCode).toBe(1);

    const output = JSON.parse(result.stdout);
    expect(output).toMatchObject({
      success: false,
      error: expect.stringContaining('Configuration file not found'),
    });
  });

  it('should collect stats when --json flag is used (implies --stats)', async () => {
    // Flow.Setup format
    const testConfig = {
      version: 1,
      flows: {
        default: {
          web: {},
          packages: {
            '@walkeros/core': { imports: ['getId'] },
          },
        },
      },
    };

    await fs.writeJson(testConfigPath, testConfig);

    const result = await runCLI(['bundle', testConfigPath, '--json']);

    expect(result.exitCode).toBe(0);

    const output = JSON.parse(result.stdout);
    expect(output.success).toBe(true);
    expect(output.data.flows[0].stats.treeshakingEffective).toBe(true);
  });

  it('should suppress decorative output in JSON mode', async () => {
    // Flow.Setup format
    const testConfig = {
      version: 1,
      flows: {
        default: {
          web: {},
          packages: {
            '@walkeros/core': { imports: ['getId'] },
          },
        },
      },
    };

    await fs.writeJson(testConfigPath, testConfig);

    const result = await runCLI(['bundle', testConfigPath, '--json']);

    expect(result.exitCode).toBe(0);

    // Should not contain decorative messages
    expect(result.stdout).not.toContain('📦 Reading configuration');
    expect(result.stdout).not.toContain('🔧 Starting bundle process');
    expect(result.stdout).not.toContain('✅ Bundle created successfully');

    // Should be valid JSON
    const output = JSON.parse(result.stdout);
    expect(output.success).toBe(true);
  });

  it('should reject invalid config format', async () => {
    // Old format - no longer supported
    const testConfig = {
      flow: {
        platform: 'web',
      },
      build: {
        packages: {},
      },
    };

    await fs.writeJson(testConfigPath, testConfig);

    const result = await runCLI(['bundle', testConfigPath, '--json']);

    expect(result.exitCode).toBe(1);

    const output = JSON.parse(result.stdout);
    expect(output.success).toBe(false);
    expect(output.error).toContain('Invalid configuration');
  });
});

describe('CLI Simulate Command', () => {
  // Placeholder for future simulate command tests
  // Current simulate functionality is tested in cli-e2e.test.ts
});
