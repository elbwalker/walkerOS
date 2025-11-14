/**
 * Bundle Mode Integration Tests
 *
 * Tests the bundle generation flow:
 * - Start bundle mode with real config
 * - Generate static JavaScript bundle
 * - Verify output file validity
 *
 * No mocks - tests actual CLI integration and file generation
 */

import { spawn, execSync } from 'child_process';
import { join } from 'path';
import { existsSync, readFileSync, writeFileSync, mkdirSync, rmSync } from 'fs';
import { tmpdir } from 'os';

describe('Bundle Mode Integration', () => {
  const projectRoot = process.cwd();
  let testOutputDir: string;
  let testOutputFile: string;

  // Build once before all tests (only if dist doesn't exist)
  beforeAll(() => {
    const distPath = join(projectRoot, 'dist/index.js');
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
    // Create unique temporary output directory for each test
    testOutputDir = join(tmpdir(), `walker-bundle-test-${Date.now()}`);
    testOutputFile = join(testOutputDir, 'walker.js');
    mkdirSync(testOutputDir, { recursive: true });
  });

  afterEach(() => {
    // Clean up test output directory
    if (existsSync(testOutputDir)) {
      rmSync(testOutputDir, { recursive: true, force: true });
    }
  });

  it('should generate valid JavaScript bundle', async () => {
    // Create test config with output pointing to our test directory (NEW format)
    const testConfigPath = join(testOutputDir, 'test-bundle-config.json');
    const testConfig = {
      flow: {
        platform: 'web',
        sources: {
          browser: {
            code: 'sourceBrowser',
            config: {
              settings: {
                elb: 'elb',
              },
            },
          },
        },
        destinations: {
          gtag: {
            code: 'destinationGtag',
            config: {
              settings: {
                ga4: {
                  measurementId: 'G-TEST123456',
                },
              },
            },
          },
        },
        collector: {
          run: true,
        },
      },
      build: {
        packages: {
          '@walkeros/collector': {
            version: 'latest',
            imports: ['startFlow'],
          },
          '@walkeros/web-source-browser': {
            version: 'latest',
            imports: ['sourceBrowser'],
          },
          '@walkeros/web-destination-gtag': {
            version: 'latest',
            imports: ['destinationGtag'],
          },
        },
        code: '// Test bundle\n',
        output: testOutputFile,
        platform: 'browser',
        format: 'iife',
        minify: true,
        globalName: 'walkerOS',
        template: join(projectRoot, '../cli/templates/base.hbs'),
        tempDir: join(tmpdir(), 'walker-test-temp'),
      },
    };
    writeFileSync(testConfigPath, JSON.stringify(testConfig, null, 2));

    // Spawn bundle mode process
    const bundleProcess = spawn('node', ['dist/index.js'], {
      cwd: projectRoot,
      env: {
        ...process.env,
        MODE: 'bundle',
        FLOW: testConfigPath,
      },
    });

    // Capture output for debugging
    const output: string[] = [];
    bundleProcess.stdout?.on('data', (data) => output.push(data.toString()));
    bundleProcess.stderr?.on('data', (data) => output.push(data.toString()));

    // Wait for process to complete
    const exitCode = await new Promise<number>((resolve) => {
      bundleProcess.on('close', (code) => resolve(code || 0));
    });

    // Bundle mode should exit successfully
    if (exitCode !== 0) {
      console.error('Bundle process output:', output.join('\n'));
    }
    expect(exitCode).toBe(0);

    // Verify output file exists
    expect(existsSync(testOutputFile)).toBe(true);

    // Read and validate file content
    const bundleContent = readFileSync(testOutputFile, 'utf-8');

    // Moderate validation: Check for expected bundle characteristics
    expect(bundleContent.length).toBeGreaterThan(1000); // Non-empty bundle
    expect(bundleContent).toContain('walkerOS'); // Global name from config
    expect(bundleContent).toMatch(/startFlow|collector|destination/i); // Key walkerOS functions

    // Validate it's syntactically valid JavaScript
    // This will throw if syntax is invalid
    expect(() => {
      new Function(bundleContent);
    }).not.toThrow();
  }, 30000); // Bundle generation may take longer than collect mode

  it('should use configuration from bundle-web.json', async () => {
    // Create test config with output pointing to our test directory (NEW format)
    const testConfigPath = join(testOutputDir, 'test-bundle-config-2.json');
    const testConfig = {
      flow: {
        platform: 'web',
        sources: {
          browser: {
            code: 'sourceBrowser',
            config: {
              settings: {
                elb: 'elb',
              },
            },
          },
        },
        destinations: {
          gtag: {
            code: 'destinationGtag',
            config: {
              settings: {
                ga4: {
                  measurementId: 'G-TEST123456',
                },
              },
            },
          },
        },
        collector: {
          run: true,
        },
      },
      build: {
        packages: {
          '@walkeros/collector': {
            version: 'latest',
            imports: ['startFlow'],
          },
          '@walkeros/web-source-browser': {
            version: 'latest',
            imports: ['sourceBrowser'],
          },
          '@walkeros/web-destination-gtag': {
            version: 'latest',
            imports: ['destinationGtag'],
          },
        },
        code: '// Test bundle\n',
        output: testOutputFile,
        platform: 'browser',
        format: 'iife',
        minify: true,
        globalName: 'walkerOS',
        template: join(projectRoot, '../cli/templates/base.hbs'),
        tempDir: join(tmpdir(), 'walker-test-temp'),
      },
    };
    writeFileSync(testConfigPath, JSON.stringify(testConfig, null, 2));

    const bundleProcess = spawn('node', ['dist/index.js'], {
      cwd: projectRoot,
      env: {
        ...process.env,
        MODE: 'bundle',
        FLOW: testConfigPath,
      },
    });

    const output: string[] = [];
    bundleProcess.stdout?.on('data', (data) => output.push(data.toString()));
    bundleProcess.stderr?.on('data', (data) => output.push(data.toString()));

    const exitCode = await new Promise<number>((resolve) => {
      bundleProcess.on('close', (code) => resolve(code || 0));
    });

    expect(exitCode).toBe(0);

    // Read bundle and verify it contains destination from config
    const bundleContent = readFileSync(testOutputFile, 'utf-8');

    // Config includes destinationGtag - should be in bundle
    expect(bundleContent).toMatch(/gtag|destinationGtag/i);

    // Config includes sourceBrowser - should be in bundle
    expect(bundleContent).toMatch(/browser|sourceBrowser/i);
  }, 30000);

  it('should handle missing config file gracefully', async () => {
    const invalidConfigPath = join(projectRoot, 'configs/nonexistent.json');

    const bundleProcess = spawn('node', ['dist/index.js'], {
      cwd: projectRoot,
      env: {
        ...process.env,
        MODE: 'bundle',
        FLOW: invalidConfigPath,
        OUTPUT_PATH: testOutputFile,
      },
    });

    const output: string[] = [];
    bundleProcess.stdout?.on('data', (data) => output.push(data.toString()));
    bundleProcess.stderr?.on('data', (data) => output.push(data.toString()));

    const exitCode = await new Promise<number>((resolve) => {
      bundleProcess.on('close', (code) => resolve(code || 0));
    });

    // Should exit with error code
    expect(exitCode).not.toBe(0);

    // Should not create output file
    expect(existsSync(testOutputFile)).toBe(false);

    // Should log error message
    const outputText = output.join('\n');
    expect(outputText).toMatch(/error|failed|not found/i);
  }, 30000);
});
