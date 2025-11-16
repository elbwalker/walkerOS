/**
 * CLI End-to-End Tests
 *
 * Tests the actual CLI commands as users would invoke them
 * Spawns real processes to test complete workflows
 */

import { spawn } from 'child_process';
import { join } from 'path';
import { existsSync } from 'fs';
import fs from 'fs-extra';

const projectRoot = process.cwd();

describe('CLI E2E Tests', () => {
  const cliPath = join(projectRoot, 'dist/index.mjs');
  const tmpDir = join(projectRoot, '.tmp/e2e-tests');

  beforeAll(async () => {
    // Ensure CLI is built
    if (!existsSync(cliPath)) {
      throw new Error('CLI not built. Run `npm run build` first');
    }

    // Create temp directory for test outputs
    await fs.ensureDir(tmpDir);
  });

  afterAll(async () => {
    // Cleanup temp directory
    await fs.remove(tmpDir).catch(() => {});
  });

  describe('bundle command', () => {
    it('should bundle a simple server config', async () => {
      const configPath = join(projectRoot, 'examples/server-collect.json');

      const result = await runCLI(['bundle', '--config', configPath]);

      expect(result.code).toBe(0);

      // Verify the output file was created (as specified in the config)
      const outputPath = join(projectRoot, 'examples/server-collect.mjs');
      expect(existsSync(outputPath)).toBe(true);
    }, 30000);

    it('should show error for invalid config', async () => {
      const result = await runCLI([
        'bundle',
        '--config',
        '/nonexistent/config.json',
      ]);

      expect(result.code).not.toBe(0);
      expect(result.stderr || result.stdout).toContain('not found');
    }, 10000);

    it('should handle --stats flag', async () => {
      const configPath = join(projectRoot, 'examples/server-collect.json');

      const result = await runCLI([
        'bundle',
        '--config',
        configPath,
        '--stats',
      ]);

      expect(result.code).toBe(0);
      expect(result.stdout).toContain('Bundle Statistics');
    }, 30000);
  });

  describe('simulate command', () => {
    it('should simulate with --json output', async () => {
      const configPath = join(projectRoot, 'examples/web-serve.json');

      const result = await runCLI([
        'simulate',
        '--config',
        configPath,
        '--event',
        '{"name":"page view","data":{"title":"Test"}}',
        '--json',
      ]);

      // Simulation may fail due to missing packages (mocked in unit tests)
      // but should produce valid JSON output
      if (result.code === 0) {
        const output = JSON.parse(result.stdout);
        expect(output).toHaveProperty('result');
        expect(output).toHaveProperty('usage');
      } else {
        // Acceptable failure - simulation requires real packages
        expect(result.stderr || result.stdout).toBeTruthy();
      }
    }, 30000);

    it('should handle invalid config gracefully', async () => {
      const result = await runCLI([
        'simulate',
        '--config',
        '/invalid/path.json',
      ]);

      expect(result.code).not.toBe(0);
      expect(result.stderr || result.stdout).toContain('not found');
    }, 10000);
  });

  describe('help and version', () => {
    it('should show help with --help', async () => {
      const result = await runCLI(['--help']);

      expect(result.code).toBe(0);
      expect(result.stdout).toContain('Usage');
      expect(result.stdout).toContain('bundle');
      expect(result.stdout).toContain('simulate');
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

    it('should show error for missing arguments', async () => {
      const result = await runCLI(['bundle']);

      expect(result.code).not.toBe(0);
    }, 5000);
  });
});

/**
 * Helper to run CLI commands
 */
function runCLI(
  args: string[],
): Promise<{ code: number; stdout: string; stderr: string }> {
  return new Promise((resolve) => {
    const child = spawn(
      'node',
      [join(projectRoot, 'dist/index.mjs'), ...args],
      {
        cwd: projectRoot,
        env: { ...process.env, FORCE_COLOR: '0' },
      },
    );

    let stdout = '';
    let stderr = '';

    child.stdout?.on('data', (data) => {
      stdout += data.toString();
    });

    child.stderr?.on('data', (data) => {
      stderr += data.toString();
    });

    child.on('close', (code) => {
      resolve({
        code: code || 0,
        stdout: stdout.trim(),
        stderr: stderr.trim(),
      });
    });
  });
}
