/**
 * CLI End-to-End Tests
 *
 * Tests the actual CLI commands as users would invoke them.
 * Spawns real processes to test complete workflows.
 */

import { spawn } from 'child_process';
import { join, resolve } from 'path';
import { existsSync } from 'fs';
import fs from 'fs-extra';
import { getId } from '@walkeros/core';

// Resolve paths relative to the cli package root (three levels up from __tests__/e2e/)
// so the test works regardless of Jest's cwd.
const projectRoot = resolve(__dirname, '..', '..', '..');
const cliPath = join(projectRoot, 'dist/cli.js');

// Skip when dist/ doesn't exist (turbo runs test without build).
// These tests run via `npm run test:integration` which builds first.
const describeIfBuilt = existsSync(cliPath) ? describe : describe.skip;

/**
 * Helper to run CLI commands with timeout and cleanup
 */
function runCLI(
  args: string[],
  timeoutMs = 120000,
): Promise<{ code: number; stdout: string; stderr: string }> {
  return new Promise((resolve) => {
    const child = spawn('node', [cliPath, ...args], {
      cwd: projectRoot,
      env: { ...process.env, FORCE_COLOR: '0' },
    });

    let stdout = '';
    let stderr = '';
    let resolved = false;

    const timer = setTimeout(() => {
      if (!resolved) {
        resolved = true;
        child.kill('SIGTERM');
        resolve({
          code: 124,
          stdout: stdout.trim(),
          stderr:
            stderr.trim() + `\n[TIMEOUT] Process killed after ${timeoutMs}ms`,
        });
      }
    }, timeoutMs);

    child.stdout?.on('data', (data) => {
      stdout += data.toString();
    });

    child.stderr?.on('data', (data) => {
      stderr += data.toString();
    });

    child.on('close', (code) => {
      if (!resolved) {
        resolved = true;
        clearTimeout(timer);
        resolve({
          code: code || 0,
          stdout: stdout.trim(),
          stderr: stderr.trim(),
        });
      }
    });
  });
}

describeIfBuilt('CLI E2E', () => {
  const testOutputDir = join(
    projectRoot,
    '.tmp',
    `cli-e2e-${Date.now()}-${getId()}`,
  );
  const testConfigPath = join(testOutputDir, 'test.config.json');

  beforeAll(async () => {
    await fs.ensureDir(testOutputDir);
  });

  afterAll(async () => {
    await fs.remove(testOutputDir).catch(() => {});
  });

  describe('bundle command', () => {
    it('should bundle a server config', async () => {
      const configPath = join(projectRoot, 'examples/server-collect.json');

      const result = await runCLI(['bundle', configPath]);

      expect(result.code).toBe(0);

      const outputPath = join(projectRoot, 'examples/server-collect.mjs');
      expect(existsSync(outputPath)).toBe(true);
    }, 120000);

    it('should output JSON format for successful bundle', async () => {
      const testConfig = {
        version: 3,
        flows: {
          default: {
            web: {},
            bundle: {
              packages: {},
              '@walkeros/core': { imports: ['getId'] },
            },
          },
        },
      };

      await fs.writeJson(testConfigPath, testConfig);

      const result = await runCLI(['bundle', testConfigPath, '--json']);

      expect(result.code).toBe(0);

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

    it('should output JSON format for failed bundle', async () => {
      const testConfig = {
        version: 3,
        flows: {
          default: {
            web: {},
            bundle: {
              packages: {},
              '@walkeros/nonexistent-package-xyz': {
                imports: ['nonexistent'],
              },
            },
          },
        },
      };

      await fs.writeJson(testConfigPath, testConfig);

      const result = await runCLI(['bundle', testConfigPath, '--json']);

      expect(result.code).toBe(1);

      const output = JSON.parse(result.stdout);
      expect(output).toMatchObject({
        success: false,
        error: expect.any(String),
        duration: expect.any(Number),
      });
    });

    it('should handle --stats flag', async () => {
      const configPath = join(projectRoot, 'examples/server-collect.json');

      const result = await runCLI(['bundle', configPath, '--stats']);

      expect(result.code).toBe(0);
      expect(result.stderr).toContain('Bundle Statistics');
    }, 120000);

    it('should suppress decorative output in JSON mode', async () => {
      const testConfig = {
        version: 3,
        flows: {
          default: {
            web: {},
            bundle: {
              packages: {},
              '@walkeros/core': { imports: ['getId'] },
            },
          },
        },
      };

      await fs.writeJson(testConfigPath, testConfig);

      const result = await runCLI(['bundle', testConfigPath, '--json']);

      expect(result.code).toBe(0);
      expect(result.stdout).not.toContain('Reading configuration');
      expect(result.stdout).not.toContain('Starting bundle process');
      expect(result.stdout).not.toContain('Bundle created successfully');

      const output = JSON.parse(result.stdout);
      expect(output.success).toBe(true);
    });

    it('should reject invalid config format', async () => {
      const testConfig = {
        flow: { platform: 'web' },
        build: { packages: {} },
      };

      await fs.writeJson(testConfigPath, testConfig);

      const result = await runCLI(['bundle', testConfigPath, '--json']);

      expect(result.code).toBe(1);

      const output = JSON.parse(result.stdout);
      expect(output.success).toBe(false);
      expect(output.error).toContain('Invalid configuration');
    });

    it('should show error for missing config file', async () => {
      const result = await runCLI([
        'bundle',
        'nonexistent-config-file.json',
        '--json',
      ]);

      expect(result.code).toBe(1);

      const output = JSON.parse(result.stdout);
      expect(output).toMatchObject({
        success: false,
        error: expect.stringContaining('Configuration file not found'),
      });
    });
  });

  describe('help and version', () => {
    it('should show help with --help', async () => {
      const result = await runCLI(['--help']);

      expect(result.code).toBe(0);
      expect(result.stdout).toContain('Usage');
      expect(result.stdout).toContain('bundle');
      expect(result.stdout).toContain('push');
      expect(result.stdout).toContain('run');
    }, 5000);

    it('should show version with --version', async () => {
      const result = await runCLI(['--version']);

      expect(result.code).toBe(0);
      expect(result.stdout).toMatch(/\d+\.\d+\.\d+/);
    }, 5000);
  });

  describe('error handling', () => {
    it('should show error for unknown command', async () => {
      const result = await runCLI(['unknown-command']);

      expect(result.code).not.toBe(0);
      expect(result.stderr || result.stdout).toContain('unknown');
    }, 5000);
  });
});
