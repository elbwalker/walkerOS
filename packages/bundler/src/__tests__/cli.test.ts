import { spawn } from 'child_process';
import fs from 'fs-extra';
import path from 'path';

describe('CLI JSON Output', () => {
  const testOutputDir = 'test-output';
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
      const child = spawn('node', ['dist/index.mjs', ...args], {
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
      packages: [{ name: '@walkeros/core', version: 'latest' }],
      customCode:
        'import { getId } from "@walkeros/core";\nexport const test = getId;',
      output: { dir: testOutputDir, filename: 'test.js' },
    };

    await fs.writeJson(testConfigPath, testConfig);

    const result = await runCLI(['--config', testConfigPath, '--json']);

    expect(result.exitCode).toBe(0);

    const output = JSON.parse(result.stdout);
    expect(output).toMatchObject({
      success: true,
      stats: {
        totalSize: expect.any(Number),
        packages: expect.any(Array),
        buildTime: expect.any(Number),
        treeshakingEffective: expect.any(Boolean),
      },
      duration: expect.any(Number),
    });

    expect(output.stats.packages).toHaveLength(1);
    expect(output.stats.packages[0].name).toBe('@walkeros/core@latest');
  });

  it('should output JSON format for failed bundle', async () => {
    // Create a test config with syntax error
    const testConfig = {
      packages: [{ name: '@walkeros/core', version: 'latest' }],
      customCode:
        'import { getId } from "@walkeros/core";\nexport const badCode = () => {\n  return getId([1,2,3] x => x * 2);\n};',
      output: { dir: testOutputDir, filename: 'error-test.js' },
    };

    await fs.writeJson(testConfigPath, testConfig);

    const result = await runCLI(['--config', testConfigPath, '--json']);

    expect(result.exitCode).toBe(1);

    const output = JSON.parse(result.stdout);
    expect(output).toMatchObject({
      success: false,
      error: expect.stringContaining('Custom code syntax error'),
      duration: expect.any(Number),
    });

    expect(output.error).toContain('line 3, column 23');
  });

  it('should output JSON format when config file not found', async () => {
    const result = await runCLI(['--config', 'nonexistent.json', '--json']);

    expect(result.exitCode).toBe(1);

    const output = JSON.parse(result.stdout);
    expect(output).toMatchObject({
      success: false,
      error: expect.stringContaining('Configuration file not found'),
      duration: expect.any(Number),
    });
  });

  it('should collect stats when --json flag is used (implies --stats)', async () => {
    const testConfig = {
      packages: [{ name: '@walkeros/core', version: 'latest' }],
      customCode:
        'import * as walkerCore from "@walkeros/core";\nexport const test = walkerCore.getId;',
      output: { dir: testOutputDir, filename: 'wildcard-test.js' },
    };

    await fs.writeJson(testConfigPath, testConfig);

    const result = await runCLI(['--config', testConfigPath, '--json']);

    expect(result.exitCode).toBe(0);

    const output = JSON.parse(result.stdout);
    expect(output.success).toBe(true);
    expect(output.stats.treeshakingEffective).toBe(false); // Should detect wildcard import
  });

  it('should suppress decorative output in JSON mode', async () => {
    const testConfig = {
      packages: [{ name: '@walkeros/core', version: 'latest' }],
      customCode: 'export const test = "hello";',
      output: { dir: testOutputDir, filename: 'minimal-test.js' },
    };

    await fs.writeJson(testConfigPath, testConfig);

    const result = await runCLI(['--config', testConfigPath, '--json']);

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
