import { execSync } from 'child_process';
import {
  writeFileSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  existsSync,
  unlinkSync,
} from 'fs';
import { join, resolve } from 'path';
import { tmpdir } from 'os';
import type { GeneratorConfig, PackageDefinition } from '../types';

const CLI_PATH = join(__dirname, '../../dist/cli.js');

describe('CLI Integration Tests', () => {
  let tempDir: string;
  let configPath: string;

  // New API structure for CLI
  const simpleCollectorConfig: GeneratorConfig = {
    sources: {
      browser: {
        code: 'sourceBrowser',
        config: {
          settings: {
            domain: 'example.com',
            autoTracking: true,
          },
        },
      },
    },
    destinations: {
      gtag: {
        code: 'destinationGtag',
        config: {
          settings: {
            ga4: { measurementId: 'G-XXXXXXXXXX' },
          },
        },
      },
    },
    run: true,
    consent: { functional: true },
  };

  const testPackages: PackageDefinition[] = [
    { name: '@walkeros/collector', version: '0.0.8' },
    { name: '@walkeros/web-source-browser', version: '0.0.9' },
    { name: '@walkeros/web-destination-gtag', version: '0.0.8' },
  ];

  // Combined config structure that CLI expects
  const cliConfig = {
    config: simpleCollectorConfig,
    packages: testPackages,
  };

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), 'walkeros-cli-test-'));
    configPath = join(tempDir, 'config.json');
    writeFileSync(configPath, JSON.stringify(cliConfig, null, 2));
  });

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true });
  });

  it('should show help when no arguments provided', () => {
    try {
      execSync(`node ${CLI_PATH}`, { encoding: 'utf-8', stdio: 'pipe' });
    } catch (error: unknown) {
      // Command should fail with missing required option
      expect((error as { status: number }).status).toBe(1);
      expect((error as { stderr: string }).stderr).toContain(
        "required option '-c, --config <path>' not specified",
      );
    }
  });

  it('should show version with --version flag', () => {
    const result = execSync(`node ${CLI_PATH} --version`, {
      encoding: 'utf-8',
      stdio: 'pipe',
    });
    expect(result.trim()).toBe('0.0.1');
  });

  // Note: The following tests would work once the CLI is updated to use the new API
  it.skip('should generate bundle to stdout', () => {
    const result = execSync(
      `node ${CLI_PATH} --config ${configPath} --stdout`,
      {
        encoding: 'utf-8',
        timeout: 30000,
      },
    );

    // Verify it's a valid IIFE bundle
    expect(result).toContain('(function(window) {');
    expect(result).toContain('WalkerOS Bundle');
    expect(result).toContain('async function initializeWalkerOS()');
    expect(result).toContain('window.walkerOS');
    expect(result).toContain('window.elb');
  }, 30000);

  it.skip('should generate bundle to output file', () => {
    const outputPath = join(tempDir, 'bundle.js');

    const result = execSync(
      `node ${CLI_PATH} --config ${configPath} --output ${outputPath}`,
      {
        encoding: 'utf-8',
        timeout: 30000,
      },
    );

    // Should confirm output location
    expect(result).toContain(outputPath);

    // Check output file exists and has content
    const bundleContent = readFileSync(outputPath, 'utf-8');
    expect(bundleContent).toContain('(function(window) {');
    expect(bundleContent).toContain('WalkerOS Bundle');
    expect(bundleContent).toContain('async function initializeWalkerOS()');
  }, 30000);

  it.skip('should show verbose output with --verbose flag', () => {
    const result = execSync(
      `node ${CLI_PATH} --config ${configPath} --stdout --verbose`,
      {
        encoding: 'utf-8',
        timeout: 30000,
      },
    );

    // Should contain verbose logging to stderr
    expect(result).toContain('WalkerOS Generator');
  }, 30000);

  it.skip('should handle JSON string input', () => {
    const jsonString = JSON.stringify(cliConfig);

    const result = execSync(
      `node ${CLI_PATH} --config '${jsonString}' --stdout`,
      {
        encoding: 'utf-8',
        timeout: 30000,
      },
    );

    // Verify it generated a valid bundle from JSON string
    expect(result).toContain('(function(window) {');
    expect(result).toContain('async function initializeWalkerOS()');
  }, 30000);

  it.skip('should validate config structure', () => {
    // Test with invalid config structure
    const invalidConfig = {
      config: { invalidStructure: true },
      packages: testPackages,
    };

    const invalidConfigPath = join(tempDir, 'invalid.json');
    writeFileSync(invalidConfigPath, JSON.stringify(invalidConfig, null, 2));

    try {
      execSync(`node ${CLI_PATH} --config ${invalidConfigPath} --stdout`, {
        encoding: 'utf-8',
        stdio: 'pipe',
        timeout: 10000,
      });
      fail('Should have thrown an error for invalid config');
    } catch (error: unknown) {
      expect((error as { status: number }).status).not.toBe(0);
      // Should contain parsing error message
      const stdout = (error as { stdout: string }).stdout || '';
      const stderr = (error as { stderr: string }).stderr || '';
      const output = stdout + ' ' + stderr;
      expect(output).toMatch(/parse|config|error|bundle/i);
    }
  });

  it('should validate package definitions', () => {
    // Test with invalid package definitions
    const configWithBadPackages = {
      config: simpleCollectorConfig,
      packages: [
        { name: '@walkeros/collector' }, // Missing version
        { version: '1.0.0' }, // Missing name
      ],
    };

    const badPackagesPath = join(tempDir, 'bad-packages.json');
    writeFileSync(
      badPackagesPath,
      JSON.stringify(configWithBadPackages, null, 2),
    );

    try {
      execSync(`node ${CLI_PATH} --config ${badPackagesPath} --stdout`, {
        encoding: 'utf-8',
        stdio: 'pipe',
        timeout: 10000,
      });
      fail('Should have thrown an error for invalid packages');
    } catch (error: unknown) {
      expect((error as { status: number }).status).not.toBe(0);
      // Should contain package validation error
      const stderr = (error as { stderr: string }).stderr;
      expect(stderr).toMatch(/packages.*must have.*version/i);
    }
  });
});
