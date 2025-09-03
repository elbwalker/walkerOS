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
import type { Flow } from '@walkeros/core';

const CLI_PATH = join(__dirname, '../dist/cli.js');

describe('CLI Integration Tests', () => {
  let tempDir: string;
  let flowConfigPath: string;

  const simpleFlowConfig: Flow.Config = {
    packages: [
      {
        id: 'walkerOSCore',
        name: '@walkeros/core',
        version: '0.0.8',
        type: 'core',
      },
      {
        id: 'walkerOSCollector',
        name: '@walkeros/collector',
        version: '0.0.8',
        type: 'collector',
      },
      {
        id: 'walkerOSSourceBrowser',
        name: '@walkeros/web-source-browser',
        version: '0.0.9',
        type: 'source',
      },
      {
        id: 'walkerOSDestinationGtag',
        name: '@walkeros/web-destination-gtag',
        version: '0.0.8',
        type: 'destination',
      },
    ],
    nodes: [
      {
        id: 'browser-source',
        type: 'source',
        package: '@walkeros/web-source-browser',
        config: { domain: 'example.com', autoTracking: true },
      },
      {
        id: 'collector',
        type: 'collector',
        package: '@walkeros/collector',
        config: { consent: { functional: true }, queue: true },
      },
      {
        id: 'gtag-destination',
        type: 'destination',
        package: '@walkeros/web-destination-gtag',
        config: { measurementId: 'G-XXXXXXXXXX' },
      },
    ],
    edges: [
      {
        id: 'browser-to-collector',
        source: 'browser-source',
        target: 'collector',
      },
      {
        id: 'collector-to-gtag',
        source: 'collector',
        target: 'gtag-destination',
      },
    ],
  };

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), 'walkeros-cli-test-'));
    flowConfigPath = join(tempDir, 'flow.json');
    writeFileSync(flowConfigPath, JSON.stringify(simpleFlowConfig, null, 2));
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
        "required option '-f, --flow <path>' not specified",
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

  it('should generate bundle to stdout', () => {
    const result = execSync(
      `node ${CLI_PATH} --flow ${flowConfigPath} --stdout`,
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
  }, 30000);

  it('should generate bundle to output file', () => {
    const outputPath = join(tempDir, 'bundle.js');

    const result = execSync(
      `node ${CLI_PATH} --flow ${flowConfigPath} --output ${outputPath}`,
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

  it('should show verbose output with --verbose flag', () => {
    const result = execSync(
      `node ${CLI_PATH} --flow ${flowConfigPath} --verbose`,
      {
        encoding: 'utf-8',
        timeout: 30000,
      },
    );

    expect(result).toContain('🔧 WalkerOS Generator');
    expect(result).toContain('Reading Flow configuration from:');
    expect(result).toContain('✓ Flow configuration loaded');
    expect(result).toContain('📦 Resolving packages');
    expect(result).toContain('✓ Bundle generated successfully');
  }, 30000);

  it('should handle invalid Flow config file', () => {
    const invalidConfigPath = join(tempDir, 'invalid.json');
    writeFileSync(invalidConfigPath, '{ invalid json');

    expect(() => {
      execSync(`node ${CLI_PATH} --flow ${invalidConfigPath}`, {
        encoding: 'utf-8',
        stdio: 'pipe',
      });
    }).toThrow();
  });

  it('should handle missing Flow config file', () => {
    const missingPath = join(tempDir, 'missing.json');

    expect(() => {
      execSync(`node ${CLI_PATH} --flow ${missingPath}`, {
        encoding: 'utf-8',
        stdio: 'pipe',
      });
    }).toThrow();
  });

  it('should validate Flow config file extension', () => {
    const txtConfigPath = join(tempDir, 'config.txt');
    writeFileSync(txtConfigPath, JSON.stringify(simpleFlowConfig));

    expect(() => {
      execSync(`node ${CLI_PATH} --flow ${txtConfigPath}`, {
        encoding: 'utf-8',
        stdio: 'pipe',
      });
    }).toThrow();
  });

  it('should validate output file extension', () => {
    const txtOutputPath = join(tempDir, 'bundle.txt');

    expect(() => {
      execSync(
        `node ${CLI_PATH} --flow ${flowConfigPath} --output ${txtOutputPath}`,
        {
          encoding: 'utf-8',
          stdio: 'pipe',
        },
      );
    }).toThrow();
  });

  it('should handle unknown commands', () => {
    expect(() => {
      execSync(`node ${CLI_PATH} unknown-command`, {
        encoding: 'utf-8',
        stdio: 'pipe',
      });
    }).toThrow();
  });

  it('should generate bundle from JSON string input', () => {
    const jsonString = JSON.stringify(simpleFlowConfig);

    const result = execSync(
      `node ${CLI_PATH} --flow '${jsonString}' --stdout`,
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
  }, 30000);

  it('should write bundle to default file location', () => {
    const defaultOutputPath = resolve(__dirname, '../output/result.js');

    // Clean up any existing file
    try {
      unlinkSync(defaultOutputPath);
    } catch {
      // File doesn't exist, that's fine
    }

    const result = execSync(`node ${CLI_PATH} --flow ${flowConfigPath}`, {
      encoding: 'utf-8',
      timeout: 30000,
      cwd: resolve(__dirname, '..'), // Run from package root
    });

    // Should show where file was written
    expect(result).toContain('Bundle written to: ./output/result.js');

    // Verify file exists and contains bundle
    expect(existsSync(defaultOutputPath)).toBe(true);
    const bundleContent = readFileSync(defaultOutputPath, 'utf-8');
    expect(bundleContent).toContain('(function(window) {');
    expect(bundleContent).toContain('WalkerOS Bundle');

    // Clean up
    unlinkSync(defaultOutputPath);
  }, 30000);

  it('should generate bundle from JSON string to output file', () => {
    const jsonString = JSON.stringify(simpleFlowConfig);
    const outputPath = join(tempDir, 'string-bundle.js');

    const result = execSync(
      `node ${CLI_PATH} --flow '${jsonString}' --output ${outputPath}`,
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

  it('should show verbose output with JSON string input', () => {
    const jsonString = JSON.stringify(simpleFlowConfig);

    const result = execSync(
      `node ${CLI_PATH} --flow '${jsonString}' --verbose`,
      {
        encoding: 'utf-8',
        timeout: 30000,
      },
    );

    expect(result).toContain('🔧 WalkerOS Generator');
    expect(result).toContain('Reading Flow configuration from JSON string');
    expect(result).toContain('✓ Flow configuration loaded');
    expect(result).toContain('📦 Resolving packages');
    expect(result).toContain('✓ Bundle generated successfully');
  }, 30000);

  it('should handle invalid JSON string input', () => {
    const invalidJson = '{ invalid json';

    expect(() => {
      execSync(`node ${CLI_PATH} --flow '${invalidJson}'`, {
        encoding: 'utf-8',
        stdio: 'pipe',
      });
    }).toThrow();
  });

  it('should maintain backward compatibility with file input', () => {
    // This should work exactly as before
    const result = execSync(
      `node ${CLI_PATH} --flow ${flowConfigPath} --verbose`,
      {
        encoding: 'utf-8',
        timeout: 30000,
      },
    );

    expect(result).toContain('🔧 WalkerOS Generator');
    expect(result).toContain(
      `Reading Flow configuration from: ${flowConfigPath}`,
    );
    expect(result).toContain('✓ Flow configuration loaded');
    expect(result).toContain('✓ Bundle generated successfully');
  }, 30000);
});
